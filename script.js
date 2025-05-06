// Initialize the sample database
let database = {
    Students: [
        { StudentID: 101, FirstName: 'John', LastName: 'Smith', Age: 20, Grade: 'A' },
        { StudentID: 102, FirstName: 'Mary', LastName: 'Johnson', Age: 19, Grade: 'B' },
        { StudentID: 103, FirstName: 'Bob', LastName: 'Williams', Age: 21, Grade: 'A' },
        { StudentID: 104, FirstName: 'Sarah', LastName: 'Brown', Age: 20, Grade: 'C' }
    ],
    Courses: [
        { CourseID: 'CS101', CourseName: 'Introduction to Programming', Credits: 3, Department: 'Computer Science' },
        { CourseID: 'MATH201', CourseName: 'Calculus I', Credits: 4, Department: 'Mathematics' },
        { CourseID: 'ENG101', CourseName: 'English Composition', Credits: 3, Department: 'English' },
        { CourseID: 'PHYS101', CourseName: 'Physics Fundamentals', Credits: 4, Department: 'Physics' }
    ]
};

// Function to execute SQL queries (simplified for demonstration)
function executeSQL(query) {
    // This is a simplified SQL parser for demonstration purposes
    // In a real application, you would use a proper SQL library or database
    
    try {
        query = query.trim();
        
        // SELECT queries
        if (query.toUpperCase().startsWith('SELECT')) {
            return handleSelect(query);
        }
        // INSERT queries
        else if (query.toUpperCase().startsWith('INSERT')) {
            return handleInsert(query);
        }
        // UPDATE queries
        else if (query.toUpperCase().startsWith('UPDATE')) {
            return handleUpdate(query);
        }
        // DELETE queries
        else if (query.toUpperCase().startsWith('DELETE')) {
            return handleDelete(query);
        }
        else {
            return { error: "Unsupported SQL command" };
        }
    } catch (e) {
        return { error: e.message };
    }
}

function handleSelect(query) {
    // Parse SELECT query
    const selectRegex = /^SELECT\s+(.+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?)(?:\s+(ASC|DESC))?)?;?$/i;
    const match = query.match(selectRegex);
    
    if (!match) {
        throw new Error("Invalid SELECT syntax");
    }
    
    const columns = match[1].trim();
    const tableName = match[2].trim();
    const whereClause = match[3] ? match[3].trim() : null;
    const orderBy = match[4] ? match[4].trim() : null;
    const orderDirection = match[5] ? match[5].trim().toUpperCase() : 'ASC';
    
    // Get the table
    if (!database[tableName]) {
        throw new Error(`Table '${tableName}' does not exist`);
    }
    
    let results = [...database[tableName]];
    
    // Apply WHERE clause if present
    if (whereClause) {
        results = results.filter(row => evaluateWhere(row, whereClause));
    }
    
    // Apply ORDER BY if present
    if (orderBy) {
        const orderColumns = orderBy.split(',').map(col => col.trim());
        results.sort((a, b) => {
            for (const col of orderColumns) {
                const aValue = a[col];
                const bValue = b[col];
                
                if (aValue !== bValue) {
                    if (typeof aValue === 'number' && typeof bValue === 'number') {
                        return orderDirection === 'ASC' ? aValue - bValue : bValue - aValue;
                    }
                    if (aValue < bValue) return orderDirection === 'ASC' ? -1 : 1;
                    if (aValue > bValue) return orderDirection === 'ASC' ? 1 : -1;
                }
            }
            return 0;
        });
    }
    
    // Handle COUNT(*) separately
    if (columns.toUpperCase() === 'COUNT(*)') {
        return { data: [{ 'COUNT(*)': results.length }] };
    }
    
    // Select specific columns
    if (columns !== '*') {
        const columnList = columns.split(',').map(col => col.trim());
        results = results.map(row => {
            const newRow = {};
            columnList.forEach(col => {
                if (row[col] !== undefined) {
                    newRow[col] = row[col];
                }
            });
            return newRow;
        });
    }
    
    return { data: results };
}

function evaluateWhere(row, whereClause) {
    // Handle IS NULL condition first
    const isNullMatch = whereClause.match(/(\w+)\s+IS\s+NULL/i);
    if (isNullMatch) {
        const column = isNullMatch[1];
        return row[column] === undefined || row[column] === null;
    }

    // Handle IN condition
    const inMatch = whereClause.match(/(\w+)\s+IN\s*\((.+?)\)/i);
    if (inMatch) {
        const column = inMatch[1];
        const values = inMatch[2].split(',').map(v => v.trim().replace(/^['"](.+?)['"]$/, '$1'));
        return values.includes(String(row[column]));
    }

    // Handle other conditions
    const conditions = whereClause.split(/\s+AND\s+/i);
    
    return conditions.every(condition => {
        const operatorMatch = condition.match(/(\w+)\s*(=|!=|>|<|>=|<=)\s*(['"]?)(.+?)\3$/);
        if (!operatorMatch) {
            throw new Error(`Invalid WHERE condition: ${condition}`);
        }
        
        const column = operatorMatch[1];
        const operator = operatorMatch[2];
        const value = operatorMatch[4];
        
        const rowValue = row[column];
        if (rowValue === undefined) {
            return false; // Column doesn't exist, so condition fails
        }
        
        // Compare based on type
        if (!isNaN(rowValue)) {
            // Numeric comparison
            const numValue = parseFloat(value);
            const rowNum = parseFloat(rowValue);
            
            switch (operator) {
                case '=': return rowNum === numValue;
                case '!=': return rowNum !== numValue;
                case '>': return rowNum > numValue;
                case '<': return rowNum < numValue;
                case '>=': return rowNum >= numValue;
                case '<=': return rowNum <= numValue;
                default: throw new Error(`Unsupported operator: ${operator}`);
            }
        } else {
            // String comparison
            switch (operator) {
                case '=': return String(rowValue) === value;
                case '!=': return String(rowValue) !== value;
                default: throw new Error(`Unsupported operator for strings: ${operator}`);
            }
        }
    });
}

function handleInsert(query) {
    // Parse INSERT query
    const insertRegex = /^INSERT\s+INTO\s+(\w+)\s*(?:\((.+?)\))?\s*VALUES\s*\((.+?)\)(?:\s*,\s*\((.+?)\))*;?$/i;
    const match = query.match(insertRegex);
    
    if (!match) {
        throw new Error("Invalid INSERT syntax");
    }
    
    const tableName = match[1].trim();
    const columns = match[2] ? match[2].split(',').map(col => col.trim()) : null;
    const valueGroups = [match[3]];
    if (match[4]) valueGroups.push(match[4]);
    
    // Get the table
    if (!database[tableName]) {
        throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Process each value group
    const newRows = [];
    
    for (const valueGroup of valueGroups) {
        const values = valueGroup.split(',').map(val => {
            const trimmed = val.trim();
            // Remove surrounding quotes if present
            if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || 
                (trimmed.startsWith('"') && trimmed.endsWith('"'))) {
                return trimmed.slice(1, -1);
            }
            return isNaN(trimmed) ? trimmed : parseFloat(trimmed);
        });
        
        // Create new row
        const newRow = {};
        
        if (columns) {
            // Insert with specified columns
            if (columns.length !== values.length) {
                throw new Error("Number of columns doesn't match number of values");
            }
            
            for (let i = 0; i < columns.length; i++) {
                newRow[columns[i]] = values[i];
            }
        } else {
            // Insert with all columns (assuming order matches table structure)
            const firstRow = database[tableName][0];
            if (!firstRow) {
                throw new Error("Cannot determine column order for empty table");
            }
            
            const tableColumns = Object.keys(firstRow);
            if (tableColumns.length !== values.length) {
                throw new Error("Number of values doesn't match table columns");
            }
            
            for (let i = 0; i < tableColumns.length; i++) {
                newRow[tableColumns[i]] = values[i];
            }
        }
        
        newRows.push(newRow);
    }
    
    // Add to database
    database[tableName].push(...newRows);
    
    return { message: `${newRows.length} row(s) inserted`, data: newRows };
}

function handleUpdate(query) {
    // Parse UPDATE query
    const updateRegex = /^UPDATE\s+(\w+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?;?$/i;
    const match = query.match(updateRegex);
    
    if (!match) {
        throw new Error("Invalid UPDATE syntax");
    }
    
    const tableName = match[1].trim();
    const setClause = match[2].trim();
    const whereClause = match[3] ? match[3].trim() : null;
    
    // Get the table
    if (!database[tableName]) {
        throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Parse SET clause
    const updates = {};
    const setParts = setClause.split(',').map(part => part.trim());
    
    for (const part of setParts) {
        const [column, value] = part.split('=').map(item => item.trim());
        // Remove surrounding quotes if present
        let processedValue = value;
        if ((value.startsWith("'") && value.endsWith("'")) || 
            (value.startsWith('"') && value.endsWith('"'))) {
            processedValue = value.slice(1, -1);
        } else if (!isNaN(value)) {
            processedValue = parseFloat(value);
        }
        updates[column] = processedValue;
    }
    
    // Apply updates
    let affectedRows = 0;
    
    for (const row of database[tableName]) {
        if (!whereClause || evaluateWhere(row, whereClause)) {
            affectedRows++;
            for (const [column, value] of Object.entries(updates)) {
                row[column] = value;
            }
        }
    }
    
    return { message: `${affectedRows} row(s) updated` };
}

function handleDelete(query) {
    // Parse DELETE query
    const deleteRegex = /^DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+?))?;?$/i;
    const match = query.match(deleteRegex);
    
    if (!match) {
        throw new Error("Invalid DELETE syntax");
    }
    
    const tableName = match[1].trim();
    const whereClause = match[2] ? match[2].trim() : null;
    
    // Get the table
    if (!database[tableName]) {
        throw new Error(`Table '${tableName}' does not exist`);
    }
    
    // Apply deletion
    let originalLength = database[tableName].length;
    
    if (whereClause) {
        database[tableName] = database[tableName].filter(row => !evaluateWhere(row, whereClause));
    } else {
        database[tableName] = [];
    }
    
    const affectedRows = originalLength - database[tableName].length;
    
    return { message: `${affectedRows} row(s) deleted` };
}

// Initialize SQL editor functionality on command pages
function initSQLPractice() {
    const editor = document.querySelector('.sql-editor');
    if (!editor) return;
    
    const textarea = editor.querySelector('textarea');
    const button = editor.querySelector('button');
    const resultsDiv = editor.querySelector('.results');
    
    button.addEventListener('click', () => {
        const query = textarea.value.trim();
        if (!query) return;
        
        const result = executeSQL(query);
        
        if (result.error) {
            resultsDiv.innerHTML = `<div class="error">Error: ${result.error}</div>`;
        } else if (result.message) {
            resultsDiv.innerHTML = `<div class="success">${result.message}</div>`;
            if (result.data) {
                resultsDiv.innerHTML += renderResults(result.data);
            }
        } else if (result.data) {
            resultsDiv.innerHTML = renderResults(result.data);
        }
    });
}

function renderResults(data) {
    if (!data || data.length === 0) {
        return '<div class="info">No results</div>';
    }
    
    const firstItem = data[0];
    const columns = Object.keys(firstItem);
    
    let html = '<table class="results-table"><thead><tr>';
    columns.forEach(col => {
        html += `<th>${col}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    data.forEach(row => {
        html += '<tr>';
        columns.forEach(col => {
            html += `<td>${row[col] !== undefined ? row[col] : 'NULL'}</td>`;
        });
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    initSQLPractice();
});