# Church Management System

A comprehensive Financial Management System for The Apostolic Church Ghana - Atta Ne Atta, designed to handle tithes, offerings, expenses, and inventory management with double-entry accounting.

## Features

- **Financial Management**
  - Track tithes and offerings
  - Manage expenses with categories (Other, District, National)
  - Automatic 77% district allocation and 23% local retention
  - Comprehensive financial reporting

- **Member Management**
  - Track individual tithes and offerings
  - Generate member contribution reports

- **Inventory Management**
  - Track church assets (Tables, Chairs, Musical Instruments, etc.)
  - Monitor item conditions and locations

- **Reporting**
  - Weekly/Monthly/Yearly financial reports
  - Profit & Loss statements
  - Export functionality for record-keeping

## Technologies Used

- **Backend**: Python (Flask)
- **Frontend**: HTML, CSS, JavaScript
- **Database**: SQLite
- **Version Control**: Git

## Setup Instructions

1. **Prerequisites**
   - Python 3.7+
   - Git
   - Web browser with JavaScript enabled

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/Afatsiawu/FMS.git
   cd FMS
   
   # Create a virtual environment
   python -m venv venv
   venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   ```

3. **Configuration**
   - Update database configuration in `app.py` if needed
   - Customize church details in the settings section

4. **Running the Application**
   ```bash
   python app.py
   ```
   Open your browser and navigate to `http://localhost:5000`

## Usage

1. **Dashboard**
   - View financial overview
   - Quick access to common actions

2. **Income Management**
   - Record offerings, tithes, and other income
   - Categorize income sources

3. **Expense Tracking**
   - Log expenses with categories
   - Attach receipts (optional)

4. **Reports**
   - Generate financial reports
   - Export data for external analysis

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For support or inquiries, please contact [Your Name] at [Your Email].

---

*Developed for The Apostolic Church Ghana - Atta Ne Atta*
