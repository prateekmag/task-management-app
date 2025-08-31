// Google Apps Script Web App URL
// Make sure your Google Apps Script is deployed as a web app with 'Anyone, even anonymous' access
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxgRKVN5bzSsUCQhOiuk26DroDYiHPyGVtGe7iOoWbinLVrvsbmLXfWunVwq6Szt6OZUw/exec';

// Helper function to log errors to console and show to user
function logError(error, message = 'An error occurred') {
    console.error(`${message}:`, error);
    showMessage(`${message}: ${error.message}`, 'error');
    return null;
}

document.getElementById('taskForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    
    // Prepare task data
    const taskData = {
        employeeName: formData.get('employeeName'),
        taskTitle: formData.get('taskTitle'),
        taskDescription: formData.get('taskDescription'),
        dueDate: formData.get('dueDate'),
        priority: formData.get('priority'),
        status: 'Pending'
    };
    
    // Disable submit button to prevent multiple submissions
    submitButton.disabled = true;
    submitButton.innerHTML = 'Saving...';
    
    try {
        console.log('Sending data:', taskData);
        
        // Create a new URL with a timestamp to prevent caching
        const url = new URL(SCRIPT_URL);
        url.searchParams.append('t', Date.now());
        
        // Try with POST and handle CORS
        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(taskData).toString()
            });
            
            // If we get here, the request was sent, but we can't read the response in no-cors mode
            // So we'll assume it was successful
            if (!response.ok) throw new Error('POST request failed');
            
        } catch (error) {
            console.log('POST with no-cors failed, trying GET...');
            // Fallback to GET if POST fails
            const getUrl = new URL(SCRIPT_URL);
            Object.keys(taskData).forEach(key => {
                getUrl.searchParams.append(key, taskData[key]);
            });
            response = await fetch(getUrl.toString());
        }
        
        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText);
        
        let result;
        try {
            result = responseText ? JSON.parse(responseText) : {};
        } catch (e) {
            console.warn('Failed to parse response as JSON');
            throw new Error('Invalid response from server');
        }
        
        if (result.status === 'success') {
            showMessage('Task created successfully!', 'success');
            form.reset();
        } else {
            throw new Error(result.message || 'Failed to create task');
        }
    } catch (error) {
        logError(error, 'Failed to submit form');
        
        // Check if the error is a network error
        if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
            showMessage('Network error: Could not connect to the server. Please check your internet connection and try again.', 'error');
        } else {
            showMessage(`Error: ${error.message}`, 'error');
        }
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Create Task';
    }
});

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = `p-3 rounded-md ${type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
    messageDiv.classList.remove('hidden');
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}
