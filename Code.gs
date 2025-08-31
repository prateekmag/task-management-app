// Handle GET requests
function doGet(e) {
  return handleRequest(e || {});
}

// Handle POST requests
function doPost(e) {
  return handleRequest(e || {});
}

// Set CORS headers
function setCors() {
  return {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '3600'
  };
}

// Handle OPTIONS request for CORS preflight
function doOptions() {
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  output.setContent(JSON.stringify({}));
  return output;
}

function handleRequest(e) {
  // Set up the response
  const output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);
  
  try {
    // Initialize data object
    let data = {};
    
    // Log the request type and parameters
    console.log('Request method:', e.postData ? 'POST' : 'GET');
    
    // Parse request data
    if (e.postData) {
      // Handle POST request
      if (e.postData.type === 'application/x-www-form-urlencoded') {
        // Parse form data
        const params = e.parameter;
        data = {
          employeeName: params.employeeName || '',
          taskTitle: params.taskTitle || '',
          taskDescription: params.taskDescription || '',
          dueDate: params.dueDate || '',
          priority: params.priority || 'Medium',
          status: 'Pending'
        };
      } else {
        // Handle JSON data
        try {
          data = JSON.parse(e.postData.contents);
        } catch (parseError) {
          console.error('Error parsing JSON data:', parseError);
          throw new Error('Invalid JSON data received');
        }
      }
    } else if (e.parameter) {
      // Handle GET request with URL parameters
      data = e.parameter;
    } else {
      // No data received
      console.log('No data received in request');
      output.setContent(JSON.stringify({
        status: 'error',
        message: 'No data received'
      }));
      return output;
    }
    
    console.log('Received data:', JSON.stringify(data, null, 2));
    
    console.log('Parsed data:', JSON.stringify(data, null, 2));
    
    // Open the active spreadsheet
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getActiveSheet();
      const now = new Date();
      
      // Create headers if this is a new sheet
      if (sheet.getLastRow() === 0) {
        sheet.appendRow([
          'Timestamp', 
          'Employee Name', 
          'Task Title', 
          'Description', 
          'Due Date', 
          'Priority',
          'Status'
        ]);
        return output.setContent(JSON.stringify({
          status: 'success',
          message: 'Sheet initialized with headers',
          data: { initialized: true }
        }));
      }
      
      // Check for duplicate entries in the last 30 seconds
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {  // Skip header row
        const lastEntries = sheet.getRange(Math.max(2, lastRow - 4), 1, Math.min(5, lastRow - 1), 7).getValues();
        const isDuplicate = lastEntries.some(row => {
          const rowTime = new Date(row[0]);
          const timeDiff = (now - rowTime) / 1000; // in seconds
          return (
            timeDiff < 30 && // Within last 30 seconds
            row[1] === data.employeeName &&
            row[2] === data.taskTitle
          );
        });
        
        if (isDuplicate) {
          return output.setContent(JSON.stringify({
            status: 'error',
            message: 'Duplicate entry detected. This task was already added recently.'
          }));
        }
      }
      
      // Prepare task data with defaults
      const taskData = {
        timestamp: new Date().toISOString(),
        employeeName: data.employeeName || '',
        taskTitle: data.taskTitle || '',
        taskDescription: data.taskDescription || '',
        dueDate: data.dueDate || '',
        priority: data.priority || 'Medium',
        status: data.status || 'Pending'
      };
      
      // Add the new task
      sheet.appendRow([
        taskData.timestamp,
        taskData.employeeName,
        taskData.taskTitle,
        taskData.taskDescription,
        taskData.dueDate,
        taskData.priority,
        taskData.status
      ]);
      
      // Return success response
      output.setContent(JSON.stringify({
        status: 'success',
        message: 'Task added successfully',
        data: taskData
      }));
      
    } catch (sheetError) {
      console.error('Error accessing spreadsheet:', sheetError);
      output.setContent(JSON.stringify({
        status: 'error',
        message: 'Error accessing spreadsheet',
        error: sheetError.toString()
      }));
    }
    
    return output;
      
  } catch (error) {
    console.error('Error in handleRequest:', error);
    
    // Return error response
    return output.setContent(JSON.stringify({
      status: 'error',
      message: error.message || 'An unknown error occurred',
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
