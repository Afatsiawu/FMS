import os
import shutil
import sys
import subprocess
from datetime import datetime

def install_packages():
    """Install required Python packages."""
    print("Installing required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pyinstaller", "pywin32"])

def create_shortcut():
    """Create a desktop shortcut for the application."""
    import winshell
    from win32com.client import Dispatch
    
    desktop = winshell.desktop()
    path = os.path.join(desktop, "Church Management System.lnk")
    target = os.path.abspath(os.path.join("dist", "Church Management System.exe"))
    icon = os.path.abspath("images.jpg")
    
    shell = Dispatch('WScript.Shell')
    shortcut = shell.CreateShortCut(path)
    shortcut.Targetpath = target
    shortcut.WorkingDirectory = os.path.dirname(target)
    shortcut.IconLocation = icon
    shortcut.save()
    print(f"Created desktop shortcut at: {path}")

def build_application():
    """Build the application using PyInstaller."""
    print("Cleaning up previous builds...")
    for item in ['build', 'dist', 'Church Management System.spec']:
        if os.path.exists(item):
            if os.path.isdir(item):
                shutil.rmtree(item)
            else:
                os.remove(item)
    
    # Create a version file
    with open('version.txt', 'w') as f:
        f.write(f"Build date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
    
    print("Building application...")
    subprocess.check_call([
        'pyinstaller',
        '--name=Church Management System',
        '--onefile',
        '--windowed',
        '--icon=images.jpg',
        '--add-data=church_management.db;.',
        '--add-data=images.jpg;.',
        '--add-data=styles.css;.',
        '--add-data=script.js;.',
        '--add-data=requirements.txt;.',
        '--add-data=version.txt;.',
        '--add-data=church_management.html;.',
        '--add-data=data;data',
        '--add-data=reports;reports',
        '--add-data=exports;exports',
        'main.py'
    ])
    
    print("\nBuild completed successfully!")
    print(f"Executable is located in: {os.path.abspath('dist')}")

if __name__ == '__main__':
    try:
        install_packages()
        build_application()
        create_shortcut()
        print("\nBuild and setup completed successfully!")
        print("You can now run the application from the desktop shortcut.")
    except Exception as e:
        print(f"An error occurred: {str(e)}")
        sys.exit(1)
