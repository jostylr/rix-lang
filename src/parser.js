/**
 * RiX Language Pratt Parser
 * Implements a Pratt parser for the RiX mathematical expression language
 */

// Precedence levels (higher numbers bind tighter)
const PRECEDENCE = {
    STATEMENT: 0,
    ASSIGNMENT: 10,      // :=, :=:, :>:, etc.
    PIPE: 20,           // |>, ||>, |>>, etc.
    ARROW: 25,          // ->, =>, :-> for function definitions
    LOGICAL_OR: 30,     // OR (if system identifier)
    LOGICAL_AND: 40,    // AND (if system identifier)  
    CONDITION: 45,      // ? operator for conditions
    EQUALITY: 50,       // =, ?=, !=
    COMPARISON: 60,     // <, >, <=, >=, ?<, ?>, etc.
    INTERVAL: 70,       // :
    ADDITION: 80,       // +, -
    MULTIPLICATION: 90, // *, /, //, %, /^, /~, /%
    EXPONENTIATION: 100, // ^, **
    UNARY: 110,         // unary -, +, NOT
    CALCULUS: 115,      // derivatives ('), integrals (')
    POSTFIX: 120,       // function calls, array access
    PROPERTY: 130       // .
};

// Symbol table for operators and their parsing behavior
const SYMBOL_TABLE = {
    // Assignment operators (right associative)
    ':=': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    ':=:': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    ':<:': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    ':>:': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    ':<=:': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    ':>=:': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    ':=>': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    
    // Pipe operators (left associative)
    '|>': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '||>': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|>>': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|>:': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|>?': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|+': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|*': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|:': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|;': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|^': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    '|?': { precedence: PRECEDENCE.PIPE, associativity: 'left', type: 'infix' },
    
    // Equality operators
    '=': { precedence: PRECEDENCE.EQUALITY, associativity: 'left', type: 'infix' },
    '?=': { precedence: PRECEDENCE.EQUALITY, associativity: 'left', type: 'infix' },
    '!=': { precedence: PRECEDENCE.EQUALITY, associativity: 'left', type: 'infix' },
    '==': { precedence: PRECEDENCE.EQUALITY, associativity: 'left', type: 'infix' },
    
    // Comparison operators
    '<': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    '>': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    '<=': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    '>=': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    '?<': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    '?>': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    '?<=': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    '?>=': { precedence: PRECEDENCE.COMPARISON, associativity: 'left', type: 'infix' },
    
    // Interval operator
    ':': { precedence: PRECEDENCE.INTERVAL, associativity: 'left', type: 'infix' },
    
    // Addition/subtraction
    '+': { precedence: PRECEDENCE.ADDITION, associativity: 'left', type: 'infix', prefix: true },
    '-': { precedence: PRECEDENCE.ADDITION, associativity: 'left', type: 'infix', prefix: true },
    
    // Multiplication/division
    '*': { precedence: PRECEDENCE.MULTIPLICATION, associativity: 'left', type: 'infix' },
    '/': { precedence: PRECEDENCE.MULTIPLICATION, associativity: 'left', type: 'infix' },
    '//': { precedence: PRECEDENCE.MULTIPLICATION, associativity: 'left', type: 'infix' },
    '%': { precedence: PRECEDENCE.MULTIPLICATION, associativity: 'left', type: 'infix' },
    '/^': { precedence: PRECEDENCE.MULTIPLICATION, associativity: 'left', type: 'infix' },
    '/~': { precedence: PRECEDENCE.MULTIPLICATION, associativity: 'left', type: 'infix' },
    '/%': { precedence: PRECEDENCE.MULTIPLICATION, associativity: 'left', type: 'infix' },
    
    // Exponentiation (right associative)
    '^': { precedence: PRECEDENCE.EXPONENTIATION, associativity: 'right', type: 'infix' },
    '**': { precedence: PRECEDENCE.EXPONENTIATION, associativity: 'right', type: 'infix' },
    
    // Function arrow (right associative)
    '->': { precedence: PRECEDENCE.ARROW, associativity: 'right', type: 'infix' },
    '=>': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    ':->': { precedence: PRECEDENCE.ASSIGNMENT, associativity: 'right', type: 'infix' },
    
    // Condition operator
    '?': { precedence: PRECEDENCE.CONDITION, associativity: 'left', type: 'infix' },
    
    // Property access
    '.': { precedence: PRECEDENCE.PROPERTY, associativity: 'left', type: 'infix' },
    
    // Calculus operators
    "'": { precedence: PRECEDENCE.CALCULUS, associativity: 'left', type: 'calculus' },
    
    // Grouping
    '(': { precedence: 0, type: 'grouping' },
    ')': { precedence: 0, type: 'grouping' },
    '[': { precedence: PRECEDENCE.POSTFIX, type: 'postfix' },
    ']': { precedence: 0, type: 'grouping' },
    '{': { precedence: 0, type: 'grouping' },
    '}': { precedence: 0, type: 'grouping' },
    '{{': { precedence: 0, type: 'codeblock' },
    '}}': { precedence: 0, type: 'codeblock' },
    
    // Separators
    ',': { precedence: 5, associativity: 'left', type: 'infix' },
    ';': { precedence: PRECEDENCE.STATEMENT, associativity: 'left', type: 'statement' }
};

class Parser {
    constructor(tokens, systemLookup) {
        this.tokens = tokens;
        this.systemLookup = systemLookup || (() => ({ type: 'identifier' }));
        this.position = 0;
        this.current = null;
        this.advance();
    }

    advance() {
        if (this.position < this.tokens.length) {
            this.current = this.tokens[this.position];
            this.position++;
        } else {
            this.current = { type: 'End', value: null, pos: [this.tokens.length, this.tokens.length, this.tokens.length] };
        }
        return this.current;
    }

    peek() {
        if (this.position < this.tokens.length) {
            return this.tokens[this.position];
        }
        return { type: 'End', value: null };
    }

    createNode(type, properties = {}) {
        const node = {
            type,
            pos: properties.pos || this.current.pos,
            original: properties.original || this.current.original,
            ...properties
        };
        return node;
    }

    error(message) {
        const pos = this.current ? this.current.pos : [0, 0, 0];
        throw new Error(`Parse error at position ${pos[0]}: ${message}`);
    }

    // Get symbol info, including system identifier lookup
    getSymbolInfo(token) {
        if (token.type === 'Symbol') {
            return SYMBOL_TABLE[token.value] || { precedence: 0, type: 'unknown' };
        } else if (token.type === 'SemicolonSequence') {
            // Semicolon sequences should not be treated as binary operators
            return { precedence: 0, type: 'separator' };
        } else if (token.type === 'Identifier' && token.kind === 'System') {
            const systemInfo = this.systemLookup(token.value);
            // Convert system lookup result to symbol table format
            if (systemInfo.type === 'operator') {
                return {
                    precedence: systemInfo.precedence || PRECEDENCE.MULTIPLICATION,
                    associativity: systemInfo.associativity || 'left',
                    type: systemInfo.operatorType || 'infix'
                };
            }
        }
        return { precedence: 0, type: 'operand' };
    }

    // Parse expression with given minimum precedence
    parseExpression(minPrec = 0) {
        let left = this.parsePrefix();

        while (this.current.type !== 'End') {
            // Check for statement terminators
            if (this.current.value === ';' || this.current.value === ',' || 
                this.current.value === ')' || this.current.value === ']' || 
                this.current.value === '}' || this.current.value === '}}' || 
                this.current.type === 'SemicolonSequence') {
                break;
            }

            // Treat comments as expression terminators
            if (this.current.type === 'String' && this.current.kind === 'comment') {
                break;
            }

            // Special case for function calls
            if (this.current.value === '(' && (left.type === 'UserIdentifier' || left.type === 'SystemIdentifier')) {
                left = this.parseInfix(left, { precedence: PRECEDENCE.POSTFIX, type: 'postfix' });
                continue;
            }

            // Special case for postfix derivatives (single quotes after function/identifier)
            if (this.current.value === "'" && (left.type === 'UserIdentifier' || left.type === 'SystemIdentifier' || 
                left.type === 'FunctionCall' || left.type === 'PropertyAccess' || left.type === 'Derivative' || left.type === 'Integral')) {
                left = this.parseDerivative(left);
                continue;
            }

            const symbolInfo = this.getSymbolInfo(this.current);
            
            if (symbolInfo.precedence < minPrec) {
                break;
            }

            if (symbolInfo.type === 'statement' || symbolInfo.type === 'separator') {
                break;
            }

            left = this.parseInfix(left, symbolInfo);
        }

        return left;
    }

    // Parse prefix expressions (literals, unary operators, grouping)
    parsePrefix() {
        const token = this.current;

        switch (token.type) {
            case 'Number':
                this.advance();
                return this.createNode('Number', {
                    value: token.value,
                    original: token.original
                });

            case 'String':
                this.advance();
                if (token.kind === 'backtick') {
                    return this.parseEmbeddedLanguage(token);
                } else {
                    return this.createNode('String', {
                        value: token.value,
                        kind: token.kind,
                        original: token.original
                    });
                }

            case 'Identifier':
                this.advance();
                if (token.kind === 'System') {
                    const systemInfo = this.systemLookup(token.value);
                    return this.createNode('SystemIdentifier', {
                        name: token.value,
                        systemInfo: systemInfo,
                        original: token.original
                    });
                } else {
                    return this.createNode('UserIdentifier', {
                        name: token.value,
                        original: token.original
                    });
                }

            case 'PlaceHolder':
                this.advance();
                return this.createNode('PlaceHolder', {
                    place: token.place,
                    original: token.original
                });

            case 'Symbol':
                if (token.value === '(') {
                    return this.parseGrouping();
                } else if (token.value === '[') {
                    return this.parseArray();
                } else if (token.value === '{') {
                    return this.parseBraceContainer();
                } else if (token.value === '{{') {
                    return this.parseCodeBlock();
                } else if (token.value === '+' || token.value === '-') {
                    return this.parseUnaryOperator();
                } else if (token.value === "'") {
                    // Leading quote for integral
                    return this.parseIntegral();
                } else if (token.value === '_') {
                    // Underscore is always a null symbol
                    this.advance();
                    return this.createNode('NULL', {
                        original: token.original
                    });
                } else {
                    this.error(`Unexpected symbol: ${token.value}`);
                }
                break;

            default:
                this.error(`Unexpected token: ${token.type}`);
        }
    }

    // Parse infix expressions (binary operators, function calls, etc.)
    parseInfix(left, symbolInfo) {
        const operator = this.current;

        // Special case for function calls - check if we have an identifier followed by '('
        if (operator.value === '(' && (left.type === 'UserIdentifier' || left.type === 'SystemIdentifier')) {
            this.advance(); // consume '('
            const args = this.parseFunctionCallArgs();
            if (this.current.value !== ')') {
                this.error('Expected closing parenthesis in function call');
            }
            this.advance(); // consume ')'
            return this.createNode('FunctionCall', {
                function: left,
                arguments: args,
                pos: left.pos,
                original: left.original + operator.original
            });
        }

        this.advance();

        let rightPrec = symbolInfo.precedence;
        if (symbolInfo.associativity === 'left') {
            rightPrec += 1;
        }

        let right;
        if (operator.value === '[' && symbolInfo.type === 'postfix') {
            // Array/property access
            right = this.parseExpression(0);
            if (this.current.value !== ']') {
                this.error('Expected closing bracket');
            }
            this.advance();
            return this.createNode('PropertyAccess', {
                object: left,
                property: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else if (operator.value === ':->') {
            // Standard function definition
            right = this.parseExpression(rightPrec);
            
            // Extract parameters if left side is a function call syntax
            let funcName = left;
            let parameters = { positional: [], keyword: [], metadata: {} };
            
            if (left.type === 'FunctionCall') {
                funcName = left.function;
                // Convert function call arguments to parameter definitions
                parameters = this.convertArgsToParams(left.arguments);
            }
            
            return this.createNode('FunctionDefinition', {
                name: funcName,
                parameters: parameters,
                body: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else if (operator.value === ':=>') {
            // Pattern matching function definition
            right = this.parseExpression(rightPrec);
            
            let funcName = left;
            let parameters = { positional: [], keyword: [], conditionals: [], metadata: {} };
            let patterns = [];
            let globalMetadata = {};
            
            if (left.type === 'FunctionCall') {
                funcName = left.function;
                parameters = this.convertArgsToParams(left.arguments);
            }
            
            // Handle different pattern syntax and parse each pattern as a function
            let rawPatterns = [];
            if (right.type === 'Array') {
                // Array syntax: g :=> [ (x ? x < 0) -> -x, (x) -> x ]
                rawPatterns = right.elements;
            } else if (right.type === 'WithMetadata' && right.primary && right.primary.type === 'Array') {
                // Array with metadata: g :=> [ [(x ? x < 0) -> -x+n, (x) -> x-n] , n := 4]
                if (Array.isArray(right.primary.elements) && right.primary.elements.length > 0 && right.primary.elements[0].type === 'Array') {
                    rawPatterns = right.primary.elements[0].elements;
                } else {
                    rawPatterns = right.primary.elements;
                }
                globalMetadata = right.metadata;
            } else {
                // Single pattern: g :=> (x ? x < 0) -> -x
                rawPatterns = [right];
            }
            
            // Parse each pattern as a function definition
            for (const pattern of rawPatterns) {
                if (pattern.type === 'FunctionLambda') {
                    // Handle FunctionLambda nodes (new parsing with higher -> precedence)
                    const patternFunc = {
                        parameters: pattern.parameters,
                        body: pattern.body
                    };
                    patterns.push(patternFunc);
                } else if (pattern.type === 'BinaryOperation' && pattern.operator === '->') {
                    // Handle legacy BinaryOperation nodes (fallback)
                    const patternFunc = {
                        parameters: { positional: [], keyword: [], conditionals: [], metadata: {} },
                        body: pattern.right
                    };
                    
                    // Parse the left side (parameters with potential conditions)
                    if (pattern.left.type === 'Grouping') {
                        const paramExpr = pattern.left.expression;
                        if (paramExpr.type === 'BinaryOperation' && paramExpr.operator === '?') {
                            // (x ? condition) format
                            const paramName = paramExpr.left.name || paramExpr.left.value;
                            patternFunc.parameters.positional.push({ name: paramName, defaultValue: null });
                            patternFunc.parameters.conditionals.push(paramExpr.right);
                        } else if (paramExpr.type === 'UserIdentifier') {
                            // Simple (x) format
                            patternFunc.parameters.positional.push({ 
                                name: paramExpr.name || paramExpr.value, 
                                defaultValue: null 
                            });
                        }
                        // TODO: Handle more complex parameter expressions
                    }
                    
                    patterns.push(patternFunc);
                }
            }
            
            return this.createNode('PatternMatchingFunction', {
                name: funcName,
                parameters: parameters,
                patterns: patterns,
                metadata: globalMetadata,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else if (operator.value === '->') {
            // Function arrow - handle ParameterList nodes specially
            right = this.parseExpression(rightPrec);
            
            // Check if left side is a ParameterList (from grouping with semicolons)
            if (left.type === 'Grouping' && left.expression && left.expression.type === 'ParameterList') {
                return this.createNode('FunctionLambda', {
                    parameters: left.expression.parameters,
                    body: right,
                    pos: left.pos,
                    original: left.original + operator.original
                });
            } else if (left.type === 'Grouping' && left.expression) {
                // Handle simple parameter cases like (x) -> expr or (x ? condition) -> expr
                let parameters = { positional: [], keyword: [], conditionals: [], metadata: {} };
                
                if (left.expression.type === 'UserIdentifier') {
                    // Single parameter: (x) -> expr
                    parameters.positional.push({ name: left.expression.name, defaultValue: null });
                } else if (left.expression.type === 'BinaryOperation' && left.expression.operator === '?') {
                    // Conditional parameter: (x ? condition) -> expr
                    const paramName = left.expression.left.name || left.expression.left.value;
                    parameters.positional.push({ name: paramName, defaultValue: null });
                    parameters.conditionals.push(left.expression.right);
                }
                
                return this.createNode('FunctionLambda', {
                    parameters: parameters,
                    body: right,
                    pos: left.pos,
                    original: left.original + operator.original
                });
            } else if (left.type === 'Tuple') {
                // Handle multiple parameters parsed directly as Tuple: (a, b) -> expr
                let parameters = { positional: [], keyword: [], conditionals: [], metadata: {} };
                
                for (const element of left.elements) {
                    if (element.type === 'UserIdentifier') {
                        parameters.positional.push({ name: element.name, defaultValue: null });
                    }
                }
                
                return this.createNode('FunctionLambda', {
                    parameters: parameters,
                    body: right,
                    pos: left.pos,
                    original: left.original + operator.original
                });
            } else {
                // Regular binary operation
                return this.createNode('BinaryOperation', {
                    operator: operator.value,
                    left: left,
                    right: right,
                    pos: left.pos,
                    original: left.original + operator.original
                });
            }
        } else if (operator.value === '|>') {
            // Simple pipe operator
            right = this.parseExpression(rightPrec);
            return this.createNode('Pipe', {
                left: left,
                right: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else if (operator.value === '||>') {
            // Explicit pipe operator with placeholders
            right = this.parseExpression(rightPrec);
            
            return this.createNode('ExplicitPipe', {
                left: left,
                right: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else if (operator.value === '|>>') {
            // Map operator
            right = this.parseExpression(rightPrec);
            return this.createNode('Map', {
                left: left,
                right: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else if (operator.value === '|>?') {
            // Filter operator
            right = this.parseExpression(rightPrec);
            return this.createNode('Filter', {
                left: left,
                right: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else if (operator.value === '|>:') {
            // Reduce operator
            right = this.parseExpression(rightPrec);
            return this.createNode('Reduce', {
                left: left,
                right: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        } else {
            // Binary operator
            right = this.parseExpression(rightPrec);
            return this.createNode('BinaryOperation', {
                operator: operator.value,
                left: left,
                right: right,
                pos: left.pos,
                original: left.original + operator.original
            });
        }
    }

    parseGrouping() {
        const startToken = this.current;
        this.advance(); // consume '('
        
        // Check for empty parentheses first
        if (this.current.value === ')') {
            this.advance(); // consume ')'
            return this.createNode('Tuple', {
                elements: [],
                pos: startToken.pos,
                original: startToken.original
            });
        }
        
        // Scan ahead to determine what type of content we have
        let hasSemicolon = false;
        let hasComma = false;
        let tempPos = this.position;
        let parenDepth = 0;
        
        while (tempPos < this.tokens.length) {
            const token = this.tokens[tempPos];
            if (token.value === '(') parenDepth++;
            else if (token.value === ')') {
                if (parenDepth === 0) break;
                parenDepth--;
            }
            else if (parenDepth === 0) {
                if (token.value === ';') {
                    hasSemicolon = true;
                    break;
                } else if (token.value === ',') {
                    hasComma = true;
                    // Don't break - continue scanning for semicolons
                }
            }
            tempPos++;
        }
        
        let result;
        if (hasSemicolon) {
            // Parse as function parameters
            const params = this.parseFunctionParameters();
            result = this.createNode('Grouping', {
                expression: this.createNode('ParameterList', {
                    parameters: params,
                    pos: startToken.pos,
                    original: startToken.original
                }),
                pos: startToken.pos,
                original: startToken.original
            });
        } else if (hasComma) {
            // Parse as tuple
            const elements = this.parseTupleElements();
            result = this.createNode('Tuple', {
                elements: elements,
                pos: startToken.pos,
                original: startToken.original
            });
        } else {
            // Parse as regular grouped expression
            const expr = this.parseExpression(0);
            result = this.createNode('Grouping', {
                expression: expr,
                pos: startToken.pos,
                original: startToken.original
            });
        }
        
        if (this.current.value !== ')') {
            this.error('Expected closing parenthesis');
        }
        this.advance(); // consume ')'
        
        return result;
    }

    parseTupleElements() {
        const elements = [];
        
        // Parse first element
        let firstElement = this.parseTupleElement();
        elements.push(firstElement);
        
        // Look for trailing comma or more elements
        while (this.current.value === ',') {
            this.advance(); // consume ','
            
            // Check for consecutive commas (syntax error)
            if (this.current.value === ',' || this.current.value === ')') {
                if (this.current.value === ',') {
                    this.error('Consecutive commas not allowed in tuples');
                }
                // Trailing comma case - we're done
                break;
            }
            
            // Parse next element
            const element = this.parseTupleElement();
            elements.push(element);
        }
        
        return elements;
    }

    parseTupleElement() {
        // Parse regular expression (underscore is handled by parsePrefix)
        return this.parseExpression(0);
    }

    parseArray() {
        const startToken = this.current;
        this.advance(); // consume '['
        
        // Check if this might be a matrix/tensor by looking for semicolons
        const result = this.parseMatrixOrArray(startToken);
        
        if (this.current.value !== ']') {
            this.error('Expected closing bracket');
        }
        this.advance(); // consume ']'
        
        return result;
    }
    
    parseMatrixOrArray(startToken) {
        const elements = [];
        let hasMetadata = false;
        let primaryElement = null;
        const metadataMap = {};
        let nonMetadataCount = 0;
        let hasSemicolons = false;
        let matrixStructure = [];
        let currentRow = [];
        
        if (this.current.value !== ']') {
            do {
                // Handle leading semicolons (empty rows at start)
                if (this.current.value === ';' || this.current.type === 'SemicolonSequence') {
                    hasSemicolons = true;
                    const semicolonCount = this.consumeSemicolonSequence();
                    
                    // Add empty row to matrix structure
                    matrixStructure.push({
                        row: [],
                        separatorLevel: semicolonCount
                    });
                    continue;
                }
                
                const element = this.parseExpression(0);
                
                // Check if this is a metadata assignment (key := value)
                if (element.type === 'BinaryOperation' && element.operator === ':=') {
                    if (hasSemicolons) {
                        this.error('Cannot mix matrix/tensor syntax with metadata - use nested array syntax');
                    }
                    hasMetadata = true;
                    // Extract the key from the left side
                    let key;
                    if (element.left.type === 'UserIdentifier') {
                        key = element.left.name;
                    } else if (element.left.type === 'SystemIdentifier') {
                        key = element.left.name;
                    } else if (element.left.type === 'String') {
                        key = element.left.value;
                    } else {
                        this.error('Metadata key must be an identifier or string');
                    }
                    metadataMap[key] = element.right;
                } else {
                    // Regular element
                    nonMetadataCount++;
                    if (hasMetadata) {
                        this.error('Cannot mix array elements with metadata - use nested array syntax like [[1,2,3], key := value]');
                    }
                    if (nonMetadataCount === 1) {
                        primaryElement = element;
                    }
                    elements.push(element);
                    currentRow.push(element);
                }
                
                // Check what comes next
                if (this.current.value === ',') {
                    this.advance();
                } else if (this.current.value === ';' || this.current.type === 'SemicolonSequence') {
                    if (hasMetadata) {
                        this.error('Cannot mix matrix/tensor syntax with metadata');
                    }
                    hasSemicolons = true;
                    const semicolonCount = this.consumeSemicolonSequence();
                    
                    // Add current row to matrix structure (even if empty)
                    matrixStructure.push({
                        row: [...currentRow],
                        separatorLevel: semicolonCount
                    });
                    currentRow = [];
                } else {
                    break;
                }
            } while (this.current.value !== ']' && this.current.type !== 'End');
        }
        
        // Add final row (always add if we have semicolons, even if empty)
        if (currentRow.length > 0 || hasSemicolons) {
            matrixStructure.push({
                row: currentRow,
                separatorLevel: 0
            });
        }
        
        // Check if we have metadata and multiple non-metadata elements
        if (hasMetadata && nonMetadataCount > 1) {
            this.error('Cannot mix array elements with metadata - use nested array syntax like [[1,2,3], key := value]');
        }
        
        // If we found metadata annotations, create a WithMetadata node
        if (hasMetadata) {
            return this.createNode('WithMetadata', {
                primary: primaryElement || this.createNode('Array', {
                    elements: [],
                    pos: startToken.pos,
                    original: startToken.original
                }),
                metadata: metadataMap,
                pos: startToken.pos,
                original: startToken.original
            });
        }
        
        // If we found semicolons, create Matrix or Tensor node
        if (hasSemicolons) {
            return this.buildMatrixTensor(matrixStructure, startToken);
        }
        
        // Otherwise, return a regular Array node
        return this.createNode('Array', {
            elements: elements,
            pos: startToken.pos,
            original: startToken.original
        });
    }
    
    buildMatrixTensor(matrixStructure, startToken) {
        // Determine maximum separator level to decide between Matrix and Tensor
        const maxSeparatorLevel = Math.max(...matrixStructure.map(item => item.separatorLevel));
        
        if (maxSeparatorLevel === 1) {
            // This is a 2D Matrix - convert structure to simple rows
            const rows = [];
            
            for (const item of matrixStructure) {
                rows.push(item.row);
            }
            
            return this.createNode('Matrix', {
                rows: rows,
                pos: startToken.pos,
                original: startToken.original
            });
        } else {
            // This is a multi-dimensional Tensor
            return this.createNode('Tensor', {
                structure: matrixStructure,
                maxDimension: maxSeparatorLevel + 1,
                pos: startToken.pos,
                original: startToken.original
            });
        }
    }
    
    consumeSemicolonSequence() {
        if (this.current.type === 'SemicolonSequence') {
            // Multiple consecutive semicolons
            const count = this.current.count;
            this.advance();
            return count;
        } else if (this.current.value === ';') {
            // Single semicolon
            this.advance();
            return 1;
        }
        return 0;
    }

    parseBraceContainer() {
        const startToken = this.current;
        this.advance(); // consume '{'
        
        const elements = [];
        let containerType = null;
        let hasAssignments = false;
        let hasPatternMatches = false;
        let hasEquations = false;
        let hasSemicolons = false;
        
        if (this.current.value !== '}') {
            do {
                const element = this.parseExpression(0);
                elements.push(element);
                
                // Check for type indicators
                if (element.type === 'PatternMatchingFunction') {
                    // Immediately throw error for pattern matching in braces
                    this.error('Pattern matching should use array syntax [ ] with sequential evaluation, not brace syntax { }. Use format: name :=> [ pattern1, pattern2, ... ]');
                } else if (element.type === 'BinaryOperation') {
                    if (element.operator === ':=') {
                        hasAssignments = true;
                    } else if (element.operator === ':=:' || element.operator === ':>:' || 
                              element.operator === ':<:' || element.operator === ':<=:' || 
                              element.operator === ':>=:') {
                        hasEquations = true;
                    }
                }
                
                if (this.current.value === ',') {
                    this.advance();
                } else if (this.current.value === ';') {
                    hasSemicolons = true;
                    this.advance();
                } else {
                    break;
                }
            } while (this.current.value !== '}' && this.current.type !== 'End');
        }
        
        if (this.current.value !== '}') {
            this.error('Expected closing brace');
        }
        this.advance(); // consume '}'
        
        // Determine container type based on contents
        if (hasEquations) {
            if (!hasSemicolons) {
                this.error('System containers must contain only equations with equation operators separated by semicolons');
            }
            if (hasAssignments || hasPatternMatches) {
                this.error('Cannot mix equations with other assignment types');
            }
            containerType = 'System';
        } else if (hasAssignments) {
            containerType = 'Map';
        } else {
            // All literals or expressions without special operators
            containerType = 'Set';
        }
        
        // Validate type homogeneity
        if (containerType === 'Map') {
            for (const element of elements) {
                if (element.type !== 'BinaryOperation' || element.operator !== ':=') {
                    this.error('Map containers must contain only key-value pairs with :=');
                }
            }
        } else if (containerType === 'System') {
            for (const element of elements) {
                if (element.type !== 'BinaryOperation' || 
                    !([':=:', ':>:', ':<:', ':<=:', ':>=:'].includes(element.operator))) {
                    this.error('System containers must contain only equations with equation operators');
                }
            }
        }
        
        return this.createNode(containerType, {
            elements: elements,
            pos: startToken.pos,
            original: startToken.original
        });
    }

    parseCodeBlock() {
        const startToken = this.current;
        this.advance(); // consume '{{'
        
        const statements = [];
        
        if (this.current.value !== '}}') {
            do {
                const statement = this.parseExpression(0);
                statements.push(statement);
                
                // Check what token we're at after parsing the expression
                if (this.current.value === ';') {
                    this.advance(); // consume semicolon and continue
                    if (this.current.value === '}}') {
                        break; // End after semicolon if we hit closing braces
                    }
                } else if (this.current.value === '}}') {
                    break; // End if we hit closing braces
                } else if (this.current.type === 'End') {
                    this.error('Expected closing }}');
                } else {
                    // If we have more tokens but no semicolon, we might have multiple statements
                    // For now, just break to handle single expressions
                    break;
                }
            } while (this.current.value !== '}}' && this.current.type !== 'End');
        }
        
        if (this.current.value !== '}}') {
            this.error('Expected closing }}');
        }
        this.advance(); // consume '}}'
        
        // Always return a CodeBlock regardless of statement count
        return this.createNode('CodeBlock', {
            statements: statements,
            pos: startToken.pos,
            original: startToken.original
        });
    }

    parseUnaryOperator() {
        const operator = this.current;
        this.advance();
        const operand = this.parseExpression(PRECEDENCE.UNARY);
        
        return this.createNode('UnaryOperation', {
            operator: operator.value,
            operand: operand,
            pos: operator.pos,
            original: operator.original
        });
    }

    // Parse derivatives (postfix quotes)
    parseDerivative(left) {
        const quotes = [];
        let originalText = '';
        
        // Collect consecutive quotes
        while (this.current.value === "'") {
            quotes.push(this.current);
            originalText += this.current.original;
            this.advance();
        }
        
        // Check for bracket notation for variables: f'[x,y]
        let variables = null;
        if (this.current.value === '[') {
            this.advance(); // consume '['
            variables = this.parseVariableList();
            if (this.current.value !== ']') {
                this.error('Expected closing bracket after variable list');
            }
            originalText += this.current.original;
            this.advance(); // consume ']'
        }
        
        // Check for evaluation/operation parentheses
        let evaluation = null;
        let operations = null;
        
        if (this.current.value === '(') {
            const parenResult = this.parseCalculusParentheses();
            if (parenResult.isEvaluation) {
                evaluation = parenResult.content;
            } else {
                operations = parenResult.content;
            }
            originalText += parenResult.original;
        }
        
        return this.createNode('Derivative', {
            function: left,
            order: quotes.length,
            variables: variables,
            evaluation: evaluation,
            operations: operations,
            pos: left.pos,
            original: left.original + originalText
        });
    }

    // Parse integrals (leading quotes)
    parseIntegral() {
        const quotes = [];
        let originalText = '';
        
        // Collect consecutive leading quotes
        while (this.current.value === "'") {
            quotes.push(this.current);
            originalText += this.current.original;
            this.advance();
        }
        
        // Parse the base function/identifier only
        let func = null;
        if (this.current.type === 'Identifier') {
            if (this.current.kind === 'System') {
                const systemInfo = this.systemLookup(this.current.value);
                func = this.createNode('SystemIdentifier', {
                    name: this.current.value,
                    systemInfo: systemInfo,
                    original: this.current.original
                });
            } else {
                func = this.createNode('UserIdentifier', {
                    name: this.current.value,
                    original: this.current.original
                });
            }
            this.advance();
        } else {
            this.error('Expected function name after integral operator');
        }
        
        // Check for bracket notation for variables: 'f[x,y]
        let variables = null;
        if (this.current.value === '[') {
            this.advance(); // consume '['
            variables = this.parseVariableList();
            if (this.current.value !== ']') {
                this.error('Expected closing bracket after variable list');
            }
            originalText += this.current.original;
            this.advance(); // consume ']'
        }
        
        // Check for evaluation/operation parentheses
        let evaluation = null;
        let operations = null;
        
        if (this.current.value === '(') {
            const parenResult = this.parseCalculusParentheses();
            if (parenResult.isEvaluation) {
                evaluation = parenResult.content;
            } else {
                operations = parenResult.content;
            }
            originalText += parenResult.original;
        }
        
        return this.createNode('Integral', {
            function: func,
            order: quotes.length,
            variables: variables,
            evaluation: evaluation,
            operations: operations,
            metadata: { integrationConstant: 'c', defaultValue: 0 },
            pos: quotes[0].pos,
            original: originalText + func.original
        });
    }

    // Parse variable lists in brackets: [x, y, z]
    parseVariableList() {
        const variables = [];
        
        if (this.current.value !== ']') {
            do {
                if (this.current.type === 'Identifier') {
                    variables.push({
                        name: this.current.value,
                        original: this.current.original
                    });
                    this.advance();
                } else {
                    this.error('Expected variable name in variable list');
                }
                
                if (this.current.value === ',') {
                    this.advance();
                } else if (this.current.value === ']') {
                    break;
                } else {
                    this.error('Expected comma or closing bracket in variable list');
                }
            } while (true);
        }
        
        return variables;
    }

    // Parse parentheses in calculus context to distinguish evaluation vs operations
    parseCalculusParentheses() {
        const startToken = this.current;
        this.advance(); // consume '('
        
        let isEvaluation = true;
        const content = [];
        let originalText = startToken.original;
        
        while (this.current.value !== ')' && this.current.type !== 'End') {
            const expr = this.parseExpression(0);
            content.push(expr);
            
            // Check if this contains operations (quotes) indicating it's an operation sequence
            if (this.containsCalculusOperations(expr)) {
                isEvaluation = false;
            }
            
            if (this.current.value === ',') {
                originalText += this.current.original;
                this.advance();
            } else {
                break;
            }
        }
        
        if (this.current.value !== ')') {
            this.error('Expected closing parenthesis');
        }
        
        originalText += this.current.original;
        this.advance(); // consume ')'
        
        return {
            isEvaluation: isEvaluation,
            content: content,
            original: originalText
        };
    }

    // Helper to check if expression contains calculus operations
    containsCalculusOperations(expr) {
        if (!expr || typeof expr !== 'object') return false;
        
        // Check for calculus node types directly
        if (expr.type === 'Derivative' || expr.type === 'Integral') {
            return true;
        }
        
        // Check for quote symbols in identifiers (like x' or 'x)
        if (expr.type === 'UserIdentifier' && expr.name) {
            return expr.name.includes("'");
        }
        
        // Recursively check child nodes
        if (expr.left && this.containsCalculusOperations(expr.left)) return true;
        if (expr.right && this.containsCalculusOperations(expr.right)) return true;
        if (expr.function && this.containsCalculusOperations(expr.function)) return true;
        if (expr.elements) {
            for (const element of expr.elements) {
                if (this.containsCalculusOperations(element)) return true;
            }
        }
        
        return false;
    }

    parseFunctionArgs() {
        const args = [];
        
        if (this.current.value !== ')') {
            do {
                args.push(this.parseExpression(0));
                if (this.current.value === ',') {
                    this.advance();
                } else {
                    break;
                }
            } while (this.current.value !== ')' && this.current.type !== 'End');
        }
        
        if (this.current.value !== ')') {
            this.error('Expected closing parenthesis in function call');
        }
        this.advance(); // consume ')'
        
        return args;
    }

    parseFunctionParameters() {
        const params = {
            positional: [],
            keyword: [],
            conditionals: [],
            metadata: {}
        };
        
        if (this.current.value === ')') {
            return params;
        }
        
        let inKeywordSection = false;
        
        while (this.current.value !== ')' && this.current.type !== 'End') {
            if (this.current.value === ';') {
                inKeywordSection = true;
                this.advance();
                continue;
            }
            
            const param = this.parseFunctionParameter(inKeywordSection);
            
            if (inKeywordSection) {
                params.keyword.push(param);
            } else {
                params.positional.push(param);
            }
            
            // Check for condition after parameter
            if (this.current.value === '?') {
                this.advance();
                const condition = this.parseExpression(PRECEDENCE.CONDITION + 1);
                params.conditionals.push(condition);
            }
            
            if (this.current.value === ',') {
                this.advance();
            } else if (this.current.value !== ')' && this.current.value !== ';') {
                break;
            }
        }
        
        return params;
    }

    parseFunctionParameter(isKeywordOnly = false) {
        const param = {
            name: null,
            defaultValue: null
        };
        
        // Parse parameter name
        if (this.current.type === 'Identifier' && this.current.kind === 'User') {
            param.name = this.current.value;
            this.advance();
        } else {
            this.error('Expected parameter name');
        }
        
        // Check for default value
        if (this.current.value === ':=') {
            this.advance();
            param.defaultValue = this.parseExpression(PRECEDENCE.ASSIGNMENT + 1);
        }
        
        // Keyword-only parameters must have default values
        if (isKeywordOnly && param.defaultValue === null) {
            this.error('Keyword-only parameters must have default values');
        }
        
        return param;
    }

    parseFunctionCallArgs() {
        const args = {
            positional: [],
            keyword: {}
        };
        
        if (this.current.value === ')') {
            return args;
        }
        
        let inKeywordSection = false;
        
        while (this.current.value !== ')' && this.current.type !== 'End') {
            if (this.current.value === ';') {
                inKeywordSection = true;
                this.advance();
                continue;
            }
            
            if (inKeywordSection) {
                // Parse keyword argument
                if (this.current.type === 'Identifier' && this.current.kind === 'User') {
                    const keyName = this.current.value;
                    const keyPos = this.current.pos;
                    const keyOriginal = this.current.original;
                    this.advance();
                    
                    if (this.current.value === ':=') {
                        this.advance();
                        const value = this.parseExpression(PRECEDENCE.ASSIGNMENT + 1);
                        args.keyword[keyName] = value;
                    } else {
                        // Shorthand: n := n (identifier is both key and value)
                        args.keyword[keyName] = this.createNode('UserIdentifier', {
                            name: keyName,
                            pos: keyPos,
                            original: keyOriginal
                        });
                    }
                } else {
                    this.error('Expected identifier for keyword argument');
                }
            } else {
                // Parse positional argument
                args.positional.push(this.parseExpression(0));
            }
            
            if (this.current.value === ',') {
                this.advance();
            } else if (this.current.value !== ')' && this.current.value !== ';') {
                break;
            }
        }
        
        return args;
    }

    convertArgsToParams(args) {
        const params = {
            positional: [],
            keyword: [],
            conditionals: [],
            metadata: {}
        };

        // Handle new function call argument structure
        if (args.positional && args.keyword) {
            // Convert positional arguments
            for (const arg of args.positional) {
                const result = this.parseParameterFromArg(arg, false);
                params.positional.push(result.param);
                if (result.condition) {
                    params.conditionals.push(result.condition);
                }
            }

            // Convert keyword arguments to keyword parameters
            for (const [key, value] of Object.entries(args.keyword)) {
                const param = {
                    name: key,
                    defaultValue: null
                };
                
                // Handle keyword argument values which can be expressions with conditions
                if (value.type === 'BinaryOperation' && value.operator === '?') {
                    // Direct condition: n -> (2 ? condition)
                    param.defaultValue = value.left;
                    params.conditionals.push(value.right);
                } else {
                    // Simple value
                    param.defaultValue = value;
                }
                
                params.keyword.push(param);
            }
        } else if (Array.isArray(args)) {
            // Handle legacy array format
            for (const arg of args) {
                const result = this.parseParameterFromArg(arg, false);
                params.positional.push(result.param);
                if (result.condition) {
                    params.conditionals.push(result.condition);
                }
            }
        }

        return params;
    }

    parseEmbeddedLanguage(token) {
        const content = token.value;
        
        // If starts with colon or no colon found, treat as RiX-String
        if (content.startsWith(':') || content.indexOf(':') === -1) {
            const body = content.startsWith(':') ? content.slice(1) : content;
            return this.createNode('EmbeddedLanguage', {
                language: 'RiX-String',
                context: null,
                body: body,
                original: token.original
            });
        }
        
        // First, try to find a proper language header with parentheses
        const parenStart = content.indexOf('(');
        let colonIndex = -1;
        let header = '';
        let body = '';
        
        if (parenStart !== -1) {
            // Look for balanced parentheses and then find colon after them
            let parenCount = 0;
            let parenEnd = -1;
            
            for (let i = parenStart; i < content.length; i++) {
                if (content[i] === '(') {
                    parenCount++;
                } else if (content[i] === ')') {
                    parenCount--;
                    if (parenCount === 0) {
                        parenEnd = i;
                        break;
                    }
                }
            }
            
            // If we found balanced parentheses, look for colon after them
            if (parenEnd !== -1) {
                const afterParens = content.slice(parenEnd + 1);
                const colonAfterParens = afterParens.indexOf(':');
                if (colonAfterParens !== -1) {
                    colonIndex = parenEnd + 1 + colonAfterParens;
                }
            }
        }
        
        // If no parentheses or no colon after parentheses, find first colon
        if (colonIndex === -1) {
            colonIndex = content.indexOf(':');
        }
        
        header = content.slice(0, colonIndex).trim();
        body = content.slice(colonIndex + 1);
        
        // Parse the header to extract language and optional context
        let language = header;
        let context = null;
        
        // Check if header has parentheses for context
        const headerParenStart = header.indexOf('(');
        const headerParenEnd = header.lastIndexOf(')');
        
        // Check for unmatched closing parenthesis
        if (headerParenEnd !== -1 && headerParenStart === -1) {
            this.error('Unmatched closing parenthesis in embedded language header');
        }
        
        if (headerParenStart !== -1) {
            let parenCount = 0;
            let parenEnd = -1;
            
            // Find the matching closing parenthesis
            for (let i = headerParenStart; i < header.length; i++) {
                if (header[i] === '(') {
                    parenCount++;
                } else if (header[i] === ')') {
                    parenCount--;
                    if (parenCount === 0) {
                        parenEnd = i;
                        break;
                    }
                }
            }
            
            // Validate parentheses structure
            if (parenEnd === -1) {
                this.error('Unmatched opening parenthesis in embedded language header');
            }
            
            if (parenEnd !== header.length - 1) {
                this.error('Invalid embedded language header format. Expected: LANGUAGE(CONTEXT):BODY');
            }
            
            // Check for multiple outer parenthetical groups
            const afterCloseParen = header.slice(parenEnd + 1);
            if (afterCloseParen.includes('(')) {
                this.error('Multiple parenthetical groups not allowed in embedded language header');
            }
            
            language = header.slice(0, headerParenStart).trim();
            context = header.slice(headerParenStart + 1, parenEnd).trim();
        }
        
        return this.createNode('EmbeddedLanguage', {
            language: language || null,
            context: context,
            body: body,
            original: token.original
        });
    }

    parseParameterFromArg(arg, inKeywordSection) {
        const result = {
            param: {
                name: null,
                defaultValue: null
            },
            condition: null
        };

        if (arg.type === 'BinaryOperation' && arg.operator === ':=') {
            // Parameter with default value: x := 5 or x := 5 ? condition
            result.param.name = arg.left.name || arg.left.value;
                    
            // Check if the right side has a condition
            if (arg.right.type === 'BinaryOperation' && arg.right.operator === '?') {
                result.param.defaultValue = arg.right.left;  
                result.condition = arg.right.right;
            } else {
                result.param.defaultValue = arg.right;
            }
        } else if (arg.type === 'BinaryOperation' && arg.operator === '?') {
            // Parameter with condition: x ? condition
            result.param.name = arg.left.name || arg.left.value;
            result.condition = arg.right;
        } else if (arg.type === 'UserIdentifier' || (arg.type === 'Identifier' && arg.kind === 'User')) {
            // Simple parameter
            result.param.name = arg.name || arg.value;
        }

        return result;
    }




    parseStatement() {
        if (this.current.type === 'End') {
            return null;
        }

        // Handle comments as standalone nodes
        if (this.current.type === 'String' && this.current.kind === 'comment') {
            const commentToken = this.current;
            this.advance();
            return this.createNode('Comment', {
                value: commentToken.value,
                kind: commentToken.kind,
                original: commentToken.original,
                pos: commentToken.pos
            });
        }

        const expr = this.parseExpression(0);
        
        // Check for semicolon
        if (this.current.value === ';') {
            this.advance();
            return this.createNode('Statement', {
                expression: expr,
                pos: expr.pos,
                original: expr.original
            });
        }
        
        return expr;
    }

    // Parse the entire program (array of statements)
    parse() {
        const statements = [];
        
        while (this.current.type !== 'End') {
            // Collect standalone comments
            if (this.current.type === 'String' && this.current.kind === 'comment') {
                const commentToken = this.current;
                this.advance();
                statements.push(this.createNode('Comment', {
                    value: commentToken.value,
                    kind: commentToken.kind,
                    original: commentToken.original,
                    pos: commentToken.pos
                }));
                continue;
            }
            
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
        }
        
        return statements;
    }
}

// Main parse function
export function parse(tokens, systemLookup) {
    const parser = new Parser(tokens, systemLookup);
    return parser.parse();
}