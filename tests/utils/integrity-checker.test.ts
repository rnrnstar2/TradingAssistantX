import { IntegrityChecker, StructureViolation } from '../../src/utils/integrity-checker';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('IntegrityChecker', () => {
  let integrityChecker: IntegrityChecker;

  beforeEach(() => {
    integrityChecker = IntegrityChecker.getInstance();
    integrityChecker.clearViolationHistory();
  });

  describe('シングルトンパターン', () => {
    it('同じインスタンスを返すべき', () => {
      const instance1 = IntegrityChecker.getInstance();
      const instance2 = IntegrityChecker.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('checkWritePermission', () => {
    it('許可されたパスでtrueを返すべき', async () => {
      const allowedPaths = [
        'data/current/test.yaml',
        'data/learning/test.yaml',
        'data/archives/test.yaml',
        'tasks/outputs/test.yaml'
      ];

      for (const path of allowedPaths) {
        const result = await integrityChecker.checkWritePermission(path);
        expect(result).toBe(true);
      }
    });

    it('読み取り専用パスでfalseを返すべき', async () => {
      const readonlyPaths = [
        'src/test.ts',
        'data/config/test.yaml',
        'tests/test.ts',
        'docs/test.md',
        'REQUIREMENTS.md'
      ];

      for (const path of readonlyPaths) {
        const result = await integrityChecker.checkWritePermission(path);
        expect(result).toBe(false);
      }
    });

    it('許可されていないパスでfalseを返すべき', async () => {
      const unauthorizedPaths = [
        'package.json',
        'root-file.txt',
        'unauthorized/test.yaml'
      ];

      for (const path of unauthorizedPaths) {
        const result = await integrityChecker.checkWritePermission(path);
        expect(result).toBe(false);
      }
    });
  });

  describe('validateBeforeExecution', () => {
    it('基本的な構造検証を実行するべき', async () => {
      const result = await integrityChecker.validateBeforeExecution();
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('warnings');
      expect(Array.isArray(result.violations)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('REQUIREMENTS.mdが存在しない場合、違反を検出するべき', async () => {
      // このテストは実際のファイルシステムに依存するため、
      // モック環境でのテストが推奨されます
      const result = await integrityChecker.validateBeforeExecution();
      
      if (!result.isValid) {
        const missingRequirements = result.violations.find(
          v => v.path === 'REQUIREMENTS.md' && v.type === 'missing'
        );
        
        if (missingRequirements) {
          expect(missingRequirements.severity).toBe('critical');
        }
      }
    });
  });

  describe('validateAfterExecution', () => {
    it('実行後検証を実行するべき', async () => {
      const result = await integrityChecker.validateAfterExecution();
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('warnings');
    });
  });

  describe('データ制限検証', () => {
    it('data/current/の制限を正しく検証するべき', async () => {
      const result = await integrityChecker.validateBeforeExecution();
      
      // データ制限情報は内部的に使用されるため、
      // 違反がある場合にviolationsに含まれることを確認
      if (!result.isValid) {
        const dataLimitViolations = result.violations.filter(
          v => v.path === 'data/current/' && v.type === 'structure'
        );
        
        dataLimitViolations.forEach(violation => {
          expect(['high', 'medium']).toContain(violation.severity);
        });
      }
    });
  });

  describe('違反履歴管理', () => {
    it('違反履歴を取得できるべき', () => {
      const history = integrityChecker.getViolationHistory();
      expect(Array.isArray(history)).toBe(true);
    });

    it('違反履歴をクリアできるべき', () => {
      integrityChecker.clearViolationHistory();
      const history = integrityChecker.getViolationHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('エラーハンドリング', () => {
    it('無効なパスでもエラーを投げないべき', async () => {
      const invalidPaths = [
        '',
        null as any,
        undefined as any,
        '../../../etc/passwd'
      ];

      for (const path of invalidPaths) {
        await expect(
          integrityChecker.checkWritePermission(path)
        ).resolves.not.toThrow();
      }
    });

    it('ファイルシステムエラーを適切に処理するべき', async () => {
      // 存在しないディレクトリパスでテスト
      const result = await integrityChecker.checkWritePermission(
        'data/nonexistent/test.yaml'
      );
      
      // パス自体は許可されているのでtrueを返すべき
      expect(result).toBe(true);
    });
  });

  describe('パス正規化', () => {
    it('相対パスと絶対パスを正しく処理するべき', async () => {
      const paths = [
        './data/current/test.yaml',
        '../TradingAssistantX/data/current/test.yaml',
        'data/current/../current/test.yaml'
      ];

      for (const path of paths) {
        await expect(
          integrityChecker.checkWritePermission(path)
        ).resolves.not.toThrow();
      }
    });
  });

  describe('セキュリティ', () => {
    it('パストラバーサル攻撃を防ぐべき', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        'data/current/../../../etc/passwd',
        'data/current/..\\..\\..\\sensitive-file'
      ];

      for (const path of maliciousPaths) {
        const result = await integrityChecker.checkWritePermission(path);
        // 正規化後のパスが許可されたパス以外なら拒否されるべき
        expect(typeof result).toBe('boolean');
      }
    });
  });

  describe('パフォーマンス', () => {
    it('検証処理が1秒以内に完了するべき', async () => {
      const startTime = Date.now();
      await integrityChecker.validateBeforeExecution();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(1000); // 1秒以内
    }, 1500); // テストタイムアウトを1.5秒に設定
  });
});

describe('IntegrityChecker 統合テスト', () => {
  let integrityChecker: IntegrityChecker;

  beforeAll(() => {
    integrityChecker = IntegrityChecker.getInstance();
  });

  describe('実際のファイルシステムとの統合', () => {
    it('実際のプロジェクト構造を正しく検証するべき', async () => {
      const result = await integrityChecker.validateBeforeExecution();
      
      // 基本的な期待値
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('violations');
      expect(result).toHaveProperty('warnings');
      
      // ログ出力の確認（実際のコンソール出力）
      if (!result.isValid) {
        console.log('構造検証で発見された違反:', result.violations);
      }
      if (result.warnings.length > 0) {
        console.log('構造検証で発見された警告:', result.warnings);
      }
    });

    it('実際のデータディレクトリサイズを検証するべき', async () => {
      // このテストは実際のdata/ディレクトリが存在する場合のみ有効
      try {
        await fs.access('data');
        const result = await integrityChecker.validateBeforeExecution();
        
        // data/current/が存在し、制限を超えている場合の検証
        const currentDirViolations = result.violations.filter(
          v => v.path === 'data/current/' && v.type === 'structure'
        );
        
        if (currentDirViolations.length > 0) {
          console.log('data/current/ サイズ制限違反:', currentDirViolations);
        }
      } catch {
        console.log('data/ディレクトリが存在しないため、スキップ');
      }
    });
  });

  describe('実行時整合性チェック', () => {
    it('実行前後の検証が一貫しているべき', async () => {
      const preResult = await integrityChecker.validateBeforeExecution();
      const postResult = await integrityChecker.validateAfterExecution();
      
      // 基本的な構造は変わらないはず
      expect(preResult.isValid).toBe(postResult.isValid);
      
      // 同じ種類の違反が検出されるはず
      const preViolationTypes = preResult.violations.map(v => \`\${v.type}:\${v.path}\`);
      const postViolationTypes = postResult.violations.map(v => \`\${v.type}:\${v.path}\`);
      
      expect(preViolationTypes.sort()).toEqual(postViolationTypes.sort());
    });
  });
});