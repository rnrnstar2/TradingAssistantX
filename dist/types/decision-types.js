export var CollectionMethod;
(function (CollectionMethod) {
    CollectionMethod["SIMPLE_HTTP"] = "http";
    CollectionMethod["PLAYWRIGHT_STEALTH"] = "stealth";
    CollectionMethod["API_PREFERRED"] = "api";
    CollectionMethod["HYBRID"] = "hybrid";
})(CollectionMethod || (CollectionMethod = {}));
// 型ガード関数
export function isDecision(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'id' in obj
        && 'type' in obj
        && 'reasoning' in obj
        && 'confidence' in obj;
}
export function isExecutionData(obj) {
    return typeof obj === 'object'
        && obj !== null
        && 'actionType' in obj;
}
