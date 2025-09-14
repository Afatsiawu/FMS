from app import app
import os
import sys

def ensure_directories():
    """Ensure all required directories exist."""
    os.makedirs('data', exist_ok=True)
    os.makedirs('reports', exist_ok=True)
    os.makedirs('exports', exist_ok=True)

if __name__ == '__main__':
    # Set up paths
    if getattr(sys, 'frozen', False):
        # Running as compiled executable
        app.static_folder = sys._MEIPASS
    
    # Ensure directories exist
    ensure_directories()
    
    # Run the Flask app
    app.run(debug=False, host='0.0.0.0', port=5000)
