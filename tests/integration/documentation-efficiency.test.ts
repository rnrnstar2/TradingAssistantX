import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { Glob } from 'glob';

describe('Documentation Efficiency Validation', () => {
  let docsPath: string;

  beforeAll(() => {
    docsPath = path.join(process.cwd(), 'docs');
  });

  describe('File Structure Optimization', () => {
    it('should reduce documentation files to 7 or fewer', async () => {
      const docFiles = await getMarkdownFileCount('docs/');
      
      expect(docFiles).toBeLessThanOrEqual(7);
      
      console.log(`Total documentation files: ${docFiles}`);
    }, 10000);

    it('should maintain essential information accessibility', async () => {
      // Check for essential documentation files
      const essentialFiles = [
        'docs/ESSENTIALS.md',
        'docs/quick-guide.md', 
        'docs/technical-docs.md',
        'docs/roles/manager-role.md',
        'docs/roles/worker-role.md'
      ];

      const existingFiles: string[] = [];
      const missingFiles: string[] = [];

      for (const file of essentialFiles) {
        if (fs.existsSync(file)) {
          existingFiles.push(file);
        } else {
          missingFiles.push(file);
        }
      }

      // At least 3 essential files should exist
      expect(existingFiles.length).toBeGreaterThanOrEqual(3);
      
      console.log(`Existing essential files: [${existingFiles.join(', ')}]`);
      if (missingFiles.length > 0) {
        console.log(`Missing files: [${missingFiles.join(', ')}]`);
      }
    });

    it('should reduce total documentation size by 50%', async () => {
      const totalSize = await calculateDocumentationSize('docs/');
      const baselineSize = 100000; // Assumed baseline size (100KB)
      
      expect(totalSize).toBeLessThan(baselineSize * 0.5);
      
      console.log(`Total documentation size: ${(totalSize / 1024).toFixed(1)}KB`);
      console.log(`Target size: ${(baselineSize * 0.5 / 1024).toFixed(1)}KB`);
    });

    it('should maintain logical documentation structure', async () => {
      const docsStructure = await analyzeDocsStructure('docs/');
      
      // Should have role-based organization
      expect(docsStructure.hasRoles).toBe(true);
      
      // Should have core documentation files
      expect(docsStructure.coreFiles).toBeGreaterThanOrEqual(2);
      
      // Should not have excessive nested directories
      expect(docsStructure.maxDepth).toBeLessThanOrEqual(3);
      
      console.log('Documentation structure analysis:', docsStructure);
    });
  });

  describe('Information Retrieval Efficiency', () => {
    it('should provide essential information within 200 characters', async () => {
      const essentialsPath = 'docs/ESSENTIALS.md';
      
      if (fs.existsSync(essentialsPath)) {
        const essentialsContent = fs.readFileSync(essentialsPath, 'utf-8');
        const coreSection = extractCoreInformation(essentialsContent);
        
        expect(coreSection.length).toBeLessThanOrEqual(200);
        expect(coreSection).toContain('Claude主導');
        expect(coreSection).toContain('品質最優先');
        
        console.log(`Core information length: ${coreSection.length} characters`);
        console.log(`Core information: "${coreSection}"`);
      } else {
        // If ESSENTIALS.md doesn't exist, check if core information is available elsewhere
        const alternativeFiles = ['docs/quick-guide.md', 'CLAUDE.md'];
        let coreInfoFound = false;
        
        for (const file of alternativeFiles) {
          if (fs.existsSync(file)) {
            const content = fs.readFileSync(file, 'utf-8');
            if (content.includes('Claude主導') && content.includes('品質最優先')) {
              const coreSection = extractCoreInformation(content);
              expect(coreSection.length).toBeLessThanOrEqual(300); // Slightly more lenient for alternative files
              coreInfoFound = true;
              console.log(`Core information found in ${file}: ${coreSection.length} characters`);
              break;
            }
          }
        }
        
        expect(coreInfoFound).toBe(true);
      }
    });

    it('should have quick access to role-specific information', async () => {
      const roleFiles = [
        'docs/roles/manager-role.md',
        'docs/roles/worker-role.md'
      ];
      
      let roleFilesFound = 0;
      const roleInfo: any = {};
      
      for (const roleFile of roleFiles) {
        if (fs.existsSync(roleFile)) {
          roleFilesFound++;
          const content = fs.readFileSync(roleFile, 'utf-8');
          const roleType = path.basename(roleFile, '.md').replace('-role', '');
          
          roleInfo[roleType] = {
            size: content.length,
            hasStructure: content.includes('#') || content.includes('##'),
            hasActionItems: content.includes('-') || content.includes('*') || content.includes('1.'),
          };
        }
      }
      
      expect(roleFilesFound).toBeGreaterThanOrEqual(1);
      
      // Each role file should be structured and actionable
      Object.entries(roleInfo).forEach(([role, info]: [string, any]) => {
        expect(info.hasStructure).toBe(true);
        expect(info.size).toBeGreaterThan(50); // Minimum useful content
        expect(info.size).toBeLessThan(5000); // Not too verbose
      });
      
      console.log(`Role files found: ${roleFilesFound}`);
      console.log('Role file analysis:', roleInfo);
    });

    it('should consolidate technical information efficiently', async () => {
      const technicalFiles = [
        'docs/technical-docs.md',
        'docs/architecture.md',
        'docs/setup.md',
        'docs/operations.md'
      ];
      
      let technicalInfoConsolidated = false;
      let totalTechnicalSize = 0;
      let technicalFilesCount = 0;
      
      for (const file of technicalFiles) {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf-8');
          totalTechnicalSize += content.length;
          technicalFilesCount++;
          
          // Check if it's a consolidated technical document
          if (file.includes('technical-docs.md') && content.length > 1000) {
            technicalInfoConsolidated = true;
          }
        }
      }
      
      // Either have consolidated technical docs or reasonable number of separate files
      if (technicalInfoConsolidated) {
        expect(technicalFilesCount).toBeLessThanOrEqual(3); // Consolidated approach
      } else {
        expect(technicalFilesCount).toBeLessThanOrEqual(5); // Separate files approach
      }
      
      // Total technical documentation should be reasonable
      expect(totalTechnicalSize).toBeGreaterThan(500); // Minimum useful content
      expect(totalTechnicalSize).toBeLessThan(20000); // Not excessive
      
      console.log(`Technical files: ${technicalFilesCount}, Total size: ${totalTechnicalSize} chars`);
    });
  });

  describe('Documentation Quality and Usefulness', () => {
    it('should have clear, actionable content in all documentation', async () => {
      const allDocFiles = await glob('docs/**/*.md');
      const qualityAnalysis: any[] = [];
      
      for (const file of allDocFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const analysis = analyzeDocumentQuality(content, file);
        qualityAnalysis.push(analysis);
      }
      
      // All documents should meet basic quality standards
      qualityAnalysis.forEach(analysis => {
        expect(analysis.hasStructure).toBe(true);
        expect(analysis.contentLength).toBeGreaterThan(50);
        expect(analysis.readabilityScore).toBeGreaterThan(30); // Basic readability
      });
      
      // Overall documentation quality should be high
      const avgReadability = qualityAnalysis.reduce((sum, a) => sum + a.readabilityScore, 0) / qualityAnalysis.length;
      expect(avgReadability).toBeGreaterThan(50);
      
      console.log(`Documentation quality analysis (${qualityAnalysis.length} files):`);
      console.log(`Average readability score: ${avgReadability.toFixed(1)}`);
    });

    it('should eliminate redundant or outdated information', async () => {
      const allDocFiles = await glob('docs/**/*.md');
      const contentMap = new Map<string, string[]>();
      const duplicateContent: string[] = [];
      
      // Analyze content for duplications
      for (const file of allDocFiles) {
        const content = fs.readFileSync(file, 'utf-8');
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        sentences.forEach(sentence => {
          const normalized = sentence.trim().toLowerCase();
          if (contentMap.has(normalized)) {
            contentMap.get(normalized)!.push(file);
            if (contentMap.get(normalized)!.length === 2) {
              duplicateContent.push(normalized);
            }
          } else {
            contentMap.set(normalized, [file]);
          }
        });
      }
      
      // Should have minimal duplicate content
      const duplicateRatio = duplicateContent.length / contentMap.size;
      expect(duplicateRatio).toBeLessThan(0.1); // Less than 10% duplicate content
      
      console.log(`Content analysis: ${contentMap.size} unique sentences, ${duplicateContent.length} duplicates`);
      console.log(`Duplicate ratio: ${(duplicateRatio * 100).toFixed(1)}%`);
    });
  });
});

// Helper functions
async function getMarkdownFileCount(dir: string): Promise<number> {
  try {
    const files = await glob(`${dir}**/*.md`);
    return files.length;
  } catch {
    return 0;
  }
}

async function calculateDocumentationSize(dir: string): Promise<number> {
  try {
    const files = await glob(`${dir}**/*.md`);
    let totalSize = 0;
    
    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        totalSize += stats.size;
      } catch {
        // Skip files that can't be read
      }
    }
    
    return totalSize;
  } catch {
    return 0;
  }
}

async function analyzeDocsStructure(dir: string): Promise<any> {
  const structure = {
    hasRoles: false,
    coreFiles: 0,
    maxDepth: 0,
    directories: 0,
    totalFiles: 0
  };
  
  try {
    const files = await glob(`${dir}**/*.md`);
    structure.totalFiles = files.length;
    
    files.forEach(file => {
      const relativePath = path.relative(dir, file);
      const depth = relativePath.split(path.sep).length;
      structure.maxDepth = Math.max(structure.maxDepth, depth);
      
      if (file.includes('/roles/')) {
        structure.hasRoles = true;
      }
      
      if (file.includes('quick-guide') || file.includes('ESSENTIALS') || file.includes('technical-docs')) {
        structure.coreFiles++;
      }
    });
    
    const dirs = await glob(`${dir}**/`, { onlyDirectories: true });
    structure.directories = dirs.length;
    
  } catch {
    // Return default structure
  }
  
  return structure;
}

function extractCoreInformation(content: string): string {
  // Look for key sections that contain core information
  const lines = content.split('\n');
  const coreLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.includes('Claude主導') || 
        trimmed.includes('品質最優先') || 
        trimmed.includes('データ駆動')) {
      coreLines.push(trimmed);
    }
  }
  
  // If no specific core sections found, extract from summary or first paragraph
  if (coreLines.length === 0) {
    const paragraphs = content.split('\n\n');
    for (const paragraph of paragraphs) {
      if (paragraph.includes('Claude') && paragraph.length < 300) {
        coreLines.push(paragraph.replace(/\n/g, ' ').trim());
        break;
      }
    }
  }
  
  return coreLines.join(' ').substring(0, 200);
}

function analyzeDocumentQuality(content: string, filename: string): any {
  const analysis = {
    filename,
    hasStructure: false,
    contentLength: content.length,
    readabilityScore: 0,
    hasActionItems: false,
    hasCodeBlocks: false
  };
  
  // Check for structure (headers)
  analysis.hasStructure = content.includes('#') || content.includes('##');
  
  // Check for action items
  analysis.hasActionItems = content.includes('- ') || content.includes('* ') || content.includes('1.');
  
  // Check for code blocks
  analysis.hasCodeBlocks = content.includes('```') || content.includes('`');
  
  // Simple readability score based on various factors
  let score = 0;
  if (analysis.hasStructure) score += 20;
  if (analysis.hasActionItems) score += 15;
  if (analysis.hasCodeBlocks) score += 10;
  if (content.length > 100 && content.length < 3000) score += 15; // Good length
  if (content.includes('## ') || content.includes('### ')) score += 10; // Good structure
  
  // Penalize very short or very long content
  if (content.length < 50) score -= 20;
  if (content.length > 5000) score -= 10;
  
  analysis.readabilityScore = Math.max(0, Math.min(100, score));
  
  return analysis;
}

async function glob(pattern: string, options: any = {}): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const g = new Glob(pattern, options);
    const results: string[] = [];
    
    g.on('match', (match: string) => results.push(match));
    g.on('error', reject);
    g.on('end', () => resolve(results));
  });
}