// Church Management System JavaScript
let currentData = {
    income: [],
    tithes: [],
    expenses: [],
    districtExpenses: [],
    nationalExpenses: [],
    inventory: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', async function() {
    try {
        // Initialize UI components first
        initializeApp();
        setCurrentDate();
        setCurrentMonth();
        
        // Load data and update UI after data is loaded
        await loadData();
        
        // Update all UI components that depend on data
        updateDashboard();
        updateReports();
        updatePLStatement();
        
        // Update all tables
        updateIncomeTable();
        updateExpensesTable();
        updateDistrictExpensesTable();
        updateNationalExpensesTable();
        
        // Show success message
        showNotification('Data loaded successfully', 'success');
    } catch (error) {
        console.error('Error initializing application:', error);
        showNotification('Error loading data: ' + error.message, 'error');
    }
    
    // Add form event listeners
    const titheForm = document.getElementById('titheForm');
    if (titheForm) {
        titheForm.addEventListener('submit', handleTitheSubmit);
    } else {
        console.error('Tithe form not found');
    }
    
    const offeringForm = document.getElementById('offeringForm');
    if (offeringForm) {
        offeringForm.addEventListener('submit', handleOfferingSubmit);
    } else {
        console.error('Offering form not found');
    }
});

function initializeApp() {
    // Navigation event listeners
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active nav link
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });

    // Form event listeners
    document.getElementById('incomeForm').addEventListener('submit', handleIncomeSubmit);
    document.getElementById('titheForm').addEventListener('submit', handleTitheSubmit);
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
    document.getElementById('inventoryForm').addEventListener('submit', handleInventorySubmit);
    document.getElementById('districtExpenseForm').addEventListener('submit', handleDistrictExpenseSubmit);
    document.getElementById('nationalExpenseForm').addEventListener('submit', handleNationalExpenseSubmit);

    // Month selector for tithes
    document.getElementById('monthSelector').addEventListener('change', function() {
        const selectedMonth = parseInt(this.value);
        updateTithesTable(selectedMonth);
        
        // Update the month display in the header
        const months = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
        document.getElementById('currentMonth').textContent = months[selectedMonth];
    });

    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('incomeDate').value = today;
    document.getElementById('expenseDate').value = today;
    document.getElementById('districtExpenseDate').value = today;
    document.getElementById('nationalExpenseDate').value = today;
}

function setCurrentDate() {
    const now = new Date();
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-GB', options);
}

function setCurrentMonth() {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = new Date().getMonth();
    document.getElementById('currentMonth').textContent = months[currentMonth];
    document.getElementById('monthSelector').value = currentMonth;
    document.getElementById('titheMonth').value = currentMonth;
}

// Navigation functions
function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionName).classList.add('active');
    
    if (sectionName === 'tithes') {
        updateTithesTable(parseInt(document.getElementById('monthSelector').value));
    }
    
    if (sectionName === 'expenses') {
        updateExpensesTable();
        updateDistrictExpensesTable();
        updateNationalExpensesTable();
    }
    
    if (sectionName === 'income') {
        updateIncomeTable();
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    // Reset form
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
}

// Form submission handlers
function handleIncomeSubmit(e) {
    e.preventDefault();
    
    const incomeData = {
        id: Date.now(),
        category: document.getElementById('incomeCategory').value,
        description: document.getElementById('incomeDescription').value,
        amount: parseFloat(document.getElementById('incomeAmount').value),
        date: document.getElementById('incomeDate').value,
        is_tithe: document.getElementById('incomeIsTithe').checked,
        is_offering: document.getElementById('incomeIsOffering').checked
    };

    // Send to backend API
    fetch('/api/income', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(incomeData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Income added successfully!', 'success');
            closeModal('incomeModal');
            
            // Reset the form
            const form = document.getElementById('incomeForm');
            form.reset();
            
            // Update all relevant UI components in parallel
            Promise.all([
                updateDashboard(),
                updateRecentTransactions(),
                updateIncomeTable(),
                updateDistrictExpensesTable(),
                updateReports(),
                updatePLStatement(),
                updateTithesAndOfferingsSummary(0) // Will be updated with actual data from the server
            ]).catch(error => {
                console.error('Error updating UI components:', error);
            });
        } else {
            showNotification('Error adding income: ' + (data.message || 'Unknown error'), 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding income: ' + error.message, 'error');
    });

}

function handleTitheSubmit(e) {
    e.preventDefault();
    console.log('Tithe form submitted');
    
    const memberName = document.getElementById('memberName').value;
    const memberId = document.getElementById('memberId').value;
    const month = parseInt(document.getElementById('titheMonth').value);
    const week = parseInt(document.getElementById('titheWeek').value);
    const titheAmount = parseFloat(document.getElementById('titheAmount').value) || 0;
    const currentDate = new Date().toISOString().split('T')[0];
    
    console.log('Form data:', {
        memberName,
        memberId,
        month,
        week,
        titheAmount,
        currentDate
    });
    
    // Prepare the data to send to the backend
    const titheData = {
        memberName: memberName,
        memberId: memberId,
        month: month,
        week: week,
        amount: titheAmount,
        date: currentDate
    };
    
    // Update local data structure
    let existingMember = currentData.tithes.find(t => 
        t.memberId === memberId && t.month === month
    );
    
    if (existingMember) {
        // Update existing member's tithe for the specific week
        existingMember[`week${week}`] = titheAmount;
        // Recalculate total
        let newTotal = 0;
        for (let i = 1; i <= 5; i++) {
            newTotal += (parseFloat(existingMember[`week${i}`]) || 0);
        }
        existingMember.total = newTotal;
        existingMember.date = currentDate;
    } else {
        // Create new member record
        const newMember = {
            id: Date.now(),
            memberName: memberName,
            memberId: memberId,
            month: month,
            date: currentDate
        };
        
        // Initialize all weeks as null
        for (let i = 1; i <= 5; i++) {
            newMember[`week${i}`] = null;
        }
        
        // Set the current week's values
        newMember[`week${week}`] = titheAmount;
        
        // Calculate initial total
        newMember.total = titheAmount;
        
        currentData.tithes.push(newMember);
    }

    console.log('Sending tithe data to server:', titheData);
    
    fetch('/api/tithes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(titheData)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Server error response:', text);
                throw new Error(`HTTP error! status: ${response.status}, details: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Server response:', data);
        if (data && data.success) {
            showNotification('Tithe added successfully!', 'success');
            closeModal('titheModal');
            document.getElementById('titheForm').reset();
            // Refresh data and update dashboard
            updateDashboard();
            updateRecentTransactions();
            updateTithesTable(titheData.month);
            updateReports();
            updatePLStatement();
        } else {
            const errorMsg = data && data.message ? data.message : 'Unknown error occurred';
            console.error('Error from server:', errorMsg);
            showNotification('Error adding tithe: ' + errorMsg, 'error');
        }
    })
    .catch(error => {
        console.error('Error in tithe submission:', error);
        showNotification('Error adding tithe: ' + (error.message || 'Check console for details'), 'error');
    });
}

function handleOfferingSubmit(e) {
    e.preventDefault();
    console.log('Offering form submitted');
    
    const month = parseInt(document.getElementById('offeringMonth').value);
    const week = parseInt(document.getElementById('offeringWeek').value);
    const offeringAmount = parseFloat(document.getElementById('offeringAmountInput').value) || 0;
    const currentDate = new Date().toISOString().split('T')[0];
    
    console.log('Offering form data:', {
        month,
        week,
        offeringAmount,
        currentDate
    });
    
    // Prepare the data to send to the backend
    const offeringData = {
        month: month,
        week: week,
        amount: offeringAmount,
        date: currentDate
    };
    
    console.log('Sending offering data to server:', offeringData);
    
    fetch('/api/offerings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(offeringData)
    })
    .then(response => {
        console.log('Offering response status:', response.status);
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Server error response:', text);
                throw new Error(`HTTP error! status: ${response.status}, details: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Offering server response:', data);
        if (data && data.success) {
            showNotification('Offering added successfully!', 'success');
            closeModal('offeringModal');
            document.getElementById('offeringForm').reset();
            // Refresh data and update dashboard
            updateDashboard();
            updateRecentTransactions();
            updateTithesTable(offeringData.month);
            updateReports();
            updatePLStatement();
        } else {
            const errorMsg = data && data.message ? data.message : 'Unknown error occurred';
            console.error('Error from server:', errorMsg);
            showNotification('Error adding offering: ' + errorMsg, 'error');
        }
    })
    .catch(error => {
        console.error('Error in offering submission:', error);
        showNotification('Error adding offering: ' + (error.message || 'Check console for details'), 'error');
    });
}

function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const expenseData = {
        id: Date.now(),
        category: document.getElementById('expenseCategory').value,
        description: document.getElementById('expenseDescription').value,
        amount: parseFloat(document.getElementById('expenseAmount').value),
        date: document.getElementById('expenseDate').value,
        expense_type: 'other'  // Explicitly set expense type
    };

    fetch('/api/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(expenseData)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                console.error('Server error response:', text);
                throw new Error(`HTTP error! status: ${response.status}, details: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        if (data && data.success) {
            showNotification('Expense added successfully!', 'success');
            closeModal('expenseModal');
            document.getElementById('expenseForm').reset();
            
            // Update all relevant components in parallel
            Promise.all([
                updateDashboard(),
                updateRecentTransactions(),
                updateExpensesTable(),
                updateDistrictExpensesTable(),
                updateReports(),
                updatePLStatement()
            ]).catch(error => {
                console.error('Error updating components:', error);
            });
        } else {
            const errorMsg = data && data.message ? data.message : 'Unknown error occurred';
            console.error('Error from server:', errorMsg);
            showNotification('Error adding expense: ' + errorMsg, 'error');
        }
    })
    .catch(error => {
        console.error('Error in expense submission:', error);
        showNotification('Error adding expense: ' + (error.message || 'Check console for details'), 'error');
    });
}

function handleInventorySubmit(e) {
    e.preventDefault();
    
    const inventoryData = {
        itemName: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        condition: document.getElementById('itemCondition').value,
        dateAdded: new Date().toISOString().split('T')[0]
    };

    // Send to backend API
    fetch('/api/inventory', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(inventoryData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('Inventory item added successfully!', 'success');
            closeModal('inventoryModal');
            document.getElementById('inventoryForm').reset();
            updateInventoryTable();
        } else {
            showNotification('Error adding inventory item: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding inventory item', 'error');
    });
}

function handleDistrictExpenseSubmit(e) {
    e.preventDefault();
    
    const districtExpenseData = {
        category: document.getElementById('districtExpenseCategory').value,
        description: document.getElementById('districtExpenseDescription').value,
        amount: parseFloat(document.getElementById('districtExpenseAmount').value),
        date: document.getElementById('districtExpenseDate').value,
        expense_type: 'district'
    };

    fetch('/api/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(districtExpenseData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('District expense added successfully!', 'success');
            closeModal('districtExpenseModal');
            document.getElementById('districtExpenseForm').reset();
            updateDashboard();
            updateRecentTransactions();
            updateDistrictExpensesTable();
        } else {
            showNotification('Error adding district expense: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding district expense', 'error');
    });
}

function handleNationalExpenseSubmit(e) {
    e.preventDefault();
    
    const nationalExpenseData = {
        category: document.getElementById('nationalExpenseCategory').value,
        description: document.getElementById('nationalExpenseDescription').value,
        amount: parseFloat(document.getElementById('nationalExpenseAmount').value),
        date: document.getElementById('nationalExpenseDate').value,
        expense_type: 'national'
    };

    fetch('/api/expenses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(nationalExpenseData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification('National expense added successfully!', 'success');
            closeModal('nationalExpenseModal');
            document.getElementById('nationalExpenseForm').reset();
            updateDashboard();
            updateRecentTransactions();
            updateNationalExpensesTable();
        } else {
            showNotification('Error adding national expense: ' + data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showNotification('Error adding national expense', 'error');
    });
}

// Helper functions
function calculateMemberTotal(member) {
    return (member.week1 || 0) + (member.week2 || 0) + (member.week3 || 0) + 
           (member.week4 || 0) + (member.week5 || 0);
}

function formatCurrency(amount) {
    return `₵${amount.toFixed(2)}`;
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-GB');
}

// Table update functions
function updateIncomeTable() {
    const tableBody = document.getElementById('incomeTable');
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #666;">Loading income data...</td></tr>';
    
    // Fetch income data from the API
    fetch('/api/income')
        .then(response => response.json())
        .then(incomeData => {
            if (!incomeData || incomeData.length === 0) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="7" style="text-align: center; color: #666;">No income records found</td>
                    </tr>
                `;
                updateTithesAndOfferingsSummary(0);
                return;
            }
            
            // Process the income data
            processIncomeData(incomeData);
        })
        .catch(error => {
            console.error('Error loading income data:', error);
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; color: #ff0000;">Error loading income data</td>
                </tr>
            `;
        });
    
    return; // Exit early, the rest is handled by processIncomeData
}

function processIncomeData(incomeData) {
    const tableBody = document.getElementById('incomeTable');
    tableBody.innerHTML = '';
    
    if (!incomeData || incomeData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #666;">No income records found</td>
            </tr>
        `;
        updateTithesAndOfferingsSummary(0);
        return;
    }
    
    let totalLocal = 0;
    let totalDistrict = 0;
    
    try {
        // Process and display income data
        incomeData.forEach(income => {
            if (!income) return;
            
            const isTitheOrOffering = income.is_tithe || income.is_offering;
            const localAmount = isTitheOrOffering ? (income.local_amount || income.amount * 0.23) : income.amount;
            const districtAmount = isTitheOrOffering ? (income.district_amount || 0) : 0;
            
            totalLocal += parseFloat(localAmount) || 0;
            totalDistrict += parseFloat(districtAmount) || 0;
            
            const row = document.createElement('tr');
            const incomeId = income.id || 0;
            row.setAttribute('data-id', incomeId);
            row.innerHTML = `
                <td>${formatDate(income.date || new Date().toISOString().split('T')[0])}</td>
                <td>${income.category || 'Income'}</td>
                <td>${income.description || '-'}</td>
                <td>${isTitheOrOffering ? `₵${(parseFloat(localAmount) + parseFloat(districtAmount)).toFixed(2)}` : `₵${parseFloat(income.amount || 0).toFixed(2)}`}</td>
                <td>₵${parseFloat(localAmount || 0).toFixed(2)}</td>
                <td>${isTitheOrOffering ? `₵${parseFloat(districtAmount || 0).toFixed(2)}` : '-'}</td>
                <td class="actions">
                    <button class="btn btn-sm btn-primary edit-btn" data-id="${incomeId}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${incomeId}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
        
        // Update the summary at the top of the table
        document.getElementById('totalLocalIncome').textContent = `₵${totalLocal.toFixed(2)}`;
        document.getElementById('totalDistrictAllocation').textContent = `₵${totalDistrict.toFixed(2)}`;
        
        // Update tithes and offerings summary
        updateTithesAndOfferingsSummary();
        
    } catch (error) {
        console.error('Error updating income table:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; color: #dc3545;">Error loading income data</td>
            </tr>
        `;
        updateTithesAndOfferingsSummary();
    }
}

// Function to update the tithes and offerings chart
function updateTithesOfferingsChart(tithes, offerings, districtAllocation, localRetention) {
    const ctx = document.getElementById('tithesOfferingsChart');
    
    // Destroy existing chart if it exists
    if (window.tithesOfferingsChart) {
        window.tithesOfferingsChart.destroy();
    }
    
    // Create new chart
    window.tithesOfferingsChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Tithes', 'Offerings', 'District Allocation', 'Local Retention'],
            datasets: [{
                data: [tithes, offerings, districtAllocation, localRetention],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.8)',  // Blue for tithes
                    'rgba(75, 192, 192, 0.8)',  // Green for offerings
                    'rgba(255, 159, 64, 0.8)',  // Orange for district
                    'rgba(153, 102, 255, 0.8)'  // Purple for local
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 159, 64, 1)',
                    'rgba(153, 102, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = Math.round((value / total) * 100);
                            return `${label}: ₵${value.toFixed(2)} (${percentage}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    });
}

// Helper function to update tithes and offerings summary
function updateTithesAndOfferingsSummary() {
    // Fetch data from the backend
    Promise.all([
        fetch('/api/income').then(r => r.json()),
        fetch('/api/tithes').then(r => r.json())
    ])
    .then(([incomeResponse, tithesResponse]) => {
        try {
            // Safely access response data with fallback to empty arrays
            const incomeData = (incomeResponse && incomeResponse.data) || [];
            const tithesData = (tithesResponse && tithesResponse.data) || [];
            
            console.log('Tithes and Offerings Data:', { incomeData, tithesData });
            
            // Filter and calculate totals for tithes and offerings
            const tithesFromIncome = Array.isArray(incomeData) ? 
                incomeData.filter(item => item && item.is_tithe) : [];
                
            const offeringsData = Array.isArray(incomeData) ? 
                incomeData.filter(item => item && item.is_offering) : [];
            
            // Calculate totals from income data with null checks
            const totalTithesFromIncome = tithesFromIncome.reduce((sum, item) => {
                return sum + (parseFloat(item?.amount) || 0);
            }, 0);
            
            const totalOfferings = offeringsData.reduce((sum, item) => {
                return sum + (parseFloat(item?.amount) || 0);
            }, 0);
            
            // Calculate tithes from tithes table (weekly tithes)
            const weeklyTithes = Array.isArray(tithesData) ? tithesData.reduce((sum, tithe) => {
                if (!tithe) return sum;
                return sum + 
                    (parseFloat(tithe.week1) || 0) + 
                    (parseFloat(tithe.week2) || 0) + 
                    (parseFloat(tithe.week3) || 0) + 
                    (parseFloat(tithe.week4) || 0) + 
                    (parseFloat(tithe.week5) || 0);
            }, 0) : 0;
            
            // Calculate total tithes (from both income and tithes table)
            const totalTithes = totalTithesFromIncome + weeklyTithes;
            
            // Calculate total tithes and offerings
            const totalTithesAndOfferings = totalTithes + totalOfferings;
            
            // Calculate district allocation (77% of tithes and offerings)
            const districtAllocation = Math.round(totalTithesAndOfferings * 0.77 * 100) / 100;
            const localRetention = Math.round(totalTithesAndOfferings * 0.23 * 100) / 100;
            
            console.log('Tithes and Offerings Summary:', {
                totalTithes,
                totalOfferings,
                totalTithesAndOfferings,
                districtAllocation,
                localRetention
            });
            
            // Safely update the summary cards with proper formatting
            const updateElementText = (id, value) => {
                const element = document.getElementById(id);
                if (element) element.textContent = formatCurrency(value);
            };
            
            updateElementText('totalTithes', totalTithes);
            updateElementText('totalOfferings', totalOfferings);
            updateElementText('totalDistrictAllocation', districtAllocation);
            updateElementText('localRetention', localRetention);
            
            // Update the chart if the container exists
            const chartContainer = document.getElementById('tithesOfferingsChartContainer');
            if (chartContainer) {
                updateTithesOfferingsChart(totalTithes, totalOfferings, districtAllocation, localRetention);
            }
            
            // Also update the dashboard with the latest values
            updateDashboard();
        } catch (error) {
            console.error('Error processing tithes and offerings data:', error);
            // Set all values to 0 on error
            const elements = ['totalTithes', 'totalOfferings', 'totalDistrictAllocation', 'localRetention'];
            elements.forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = formatCurrency(0);
            });
            throw error;
        }
    })
    .catch(error => {
        console.error('Error updating tithes and offerings summary:', error);
        // Set all values to 0 on error
        const elements = ['totalTithes', 'totalOfferings', 'totalDistrictAllocation', 'localRetention'];
        elements.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = formatCurrency(0);
        });
    });
};

function updateTithesTable(month) {
    // Show loading state
    const tbody = document.getElementById('tithesTable');
    tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">Loading records...</td></tr>';
    
    // Fetch both tithes and offerings data
    Promise.all([
        fetch(`/api/tithes?month=${month}`).then(response => response.json()),
        fetch(`/api/offerings?month=${month}`).then(response => response.json())
    ])
    .then(([tithesData, offeringsData]) => {
        // Combine data by member
        const memberData = {};
        
        // Process tithes
        tithesData.forEach(tithe => {
            const key = `${tithe.memberId}-${tithe.month}`;
            if (!memberData[key]) {
                memberData[key] = {
                    memberName: tithe.memberName,
                    memberId: tithe.memberId,
                    month: tithe.month,
                    tithes: {},
                    offerings: {}
                };
            }
            for (let i = 1; i <= 5; i++) {
                if (tithe[`week${i}`] !== null && tithe[`week${i}`] !== undefined) {
                    memberData[key].tithes[`week${i}`] = tithe[`week${i}`];
                    console.log(`Frontend: Setting week${i} = ${tithe[`week${i}`]} for ${tithe.memberName}`);
                }
            }
        });
        
        // Process offerings (only non-general offerings for individual members)
        offeringsData.forEach(offering => {
            // Skip general offerings - they're handled separately
            if (offering.memberName === 'General Offering') return;
            
            const key = `${offering.memberId}-${offering.month}`;
            if (!memberData[key]) {
                memberData[key] = {
                    memberName: offering.memberName,
                    memberId: offering.memberId,
                    month: offering.month,
                    tithes: {},
                    offerings: {}
                };
            }
            for (let i = 1; i <= 5; i++) {
                memberData[key].offerings[`week${i}`] = offering[`week${i}`] || 0;
            }
        });
        
        if (Object.keys(memberData).length === 0 && !offeringsData.find(o => o.memberName === 'General Offering')) {
            tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">No records yet</td></tr>';
            return;
        }

        // Add general offering row first
        let html = '';
        
        // Find general offering data
        const generalOffering = offeringsData.find(o => o.memberName === 'General Offering');
        if (generalOffering) {
            html += `
                <tr class="offering-header" style="background-color: #f8f9fa; font-weight: bold;">
                    <td colspan="2" class="text-center">General Offering</td>
                    <td class="text-center">${generalOffering.week1 ? formatCurrency(generalOffering.week1) : '-'}</td>
                    <td class="text-center">${generalOffering.week2 ? formatCurrency(generalOffering.week2) : '-'}</td>
                    <td class="text-center">${generalOffering.week3 ? formatCurrency(generalOffering.week3) : '-'}</td>
                    <td class="text-center">${generalOffering.week4 ? formatCurrency(generalOffering.week4) : '-'}</td>
                    <td class="text-center">${generalOffering.week5 ? formatCurrency(generalOffering.week5) : '-'}</td>
                    <td class="text-center"><strong>${formatCurrency(generalOffering.total || 0)}</strong></td>
                    <td></td>
                </tr>
            `;
        }
        
        // Add header for individual tithes
        html += `
            <tr class="offering-header" style="background-color: #e9ecef;">
                <td colspan="2" class="text-center" style="font-weight: bold;">Individual Tithes</td>
                <td class="text-center"><small>Week 1</small></td>
                <td class="text-center"><small>Week 2</small></td>
                <td class="text-center"><small>Week 3</small></td>
                <td class="text-center"><small>Week 4</small></td>
                <td class="text-center"><small>Week 5</small></td>
                <td colspan="2"></td>
            </tr>
        `;
            
        // Add member rows (only tithe data, no individual offerings)
        Object.values(memberData).forEach(member => {
            // Calculate totals (only tithes)
            const titheTotal = Object.values(member.tithes).reduce((sum, val) => sum + (val || 0), 0);
            
            // Only show tithe row (no offering row for individual members)
            console.log(`Displaying member ${member.memberName}:`, member.tithes);
            html += `
            <tr>
                <td>${member.memberName}</td>
                <td>${member.memberId || 'N/A'}</td>
                <td>${member.tithes.week1 ? formatCurrency(member.tithes.week1) : '-'}</td>
                <td>${member.tithes.week2 ? formatCurrency(member.tithes.week2) : '-'}</td>
                <td>${member.tithes.week3 ? formatCurrency(member.tithes.week3) : '-'}</td>
                <td>${member.tithes.week4 ? formatCurrency(member.tithes.week4) : '-'}</td>
                <td>${member.tithes.week5 ? formatCurrency(member.tithes.week5) : '-'}</td>
                <td><strong>${formatCurrency(titheTotal)}</strong></td>
                <td class="actions">
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${member.memberId}" data-month="${member.month}">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>`;
        });
        
        tbody.innerHTML = html;
        
        // Update total individual tithe display
        updateIncomeTable();
    })
    .catch(error => {
        console.error('Error loading records:', error);
        tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: #666;">Error loading records</td></tr>';
    });
}

function updateExpensesTable() {
    // Fetch expenses and tithe/offering data
    Promise.all([
        fetch('/api/expenses').then(r => r.json()),
        fetch('/api/tithes').then(r => r.json()),
        fetch('/api/offerings').then(r => r.json())
    ]).then(([expensesData, tithesData, offeringsData]) => {
        // Sort expenses by date and ID to show latest entries first
        const sortedExpensesData = expensesData.sort((a, b) => {
            // First sort by date (newest first)
            const dateCompare = new Date(b.date) - new Date(a.date);
            if (dateCompare !== 0) return dateCompare;
            // If dates are equal, sort by ID (newest first)
            return (b.id || 0) - (a.id || 0);
        });
        
        const tbody = document.getElementById('expensesTable');
        
        if (sortedExpensesData.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No expense records yet</td></tr>';
        } else {
            tbody.innerHTML = sortedExpensesData.map(expense => `
                <tr>
                    <td>${formatDate(expense.date)}</td>
                    <td>${expense.category}</td>
                    <td>${expense.description}</td>
                    <td>${formatCurrency(expense.amount)}</td>
                    <td><span class="badge ${expense.expense_type === 'district' ? 'badge-warning' : expense.expense_type === 'national' ? 'badge-danger' : 'badge-secondary'}">${expense.expense_type || 'Local'}</span></td>
                    <td class="actions">
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${expense.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        }
        
        // Calculate total individual tithe and offerings for expense section
        const totalIndividualTithe = tithesData.reduce((sum, tithe) => sum + (tithe.total || 0), 0);
        const totalOfferings = offeringsData.reduce((sum, offering) => sum + (offering.total || 0), 0);
        const totalTitheAndOffering = totalIndividualTithe + totalOfferings;
        const districtAmount = totalTitheAndOffering * 0.77; // 77% for district/national
        
        document.getElementById('totalExpenseTithe').textContent = formatCurrency(totalTitheAndOffering);
        document.getElementById('districtTitheAmount').textContent = formatCurrency(districtAmount);
    })
    .catch(error => {
        console.error('Error loading expenses:', error);
        const tbody = document.getElementById('expensesTable');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Error loading expenses</td></tr>';
        document.getElementById('totalExpenseTithe').textContent = formatCurrency(0);
        document.getElementById('districtTitheAmount').textContent = formatCurrency(0);
    });
    
    // Also update the local expenses table
    fetch('/api/expenses?type=other')
        .then(response => response.json())
        .then(expensesData => {
            const tbody = document.getElementById('otherExpensesTable');
            
            if (expensesData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No local expenses yet</td></tr>';
                return;
            }

            tbody.innerHTML = expensesData.map(expense => `
                <tr>
                    <td>${formatDate(expense.date)}</td>
                    <td>${expense.category}</td>
                    <td>${expense.description}</td>
                    <td>${formatCurrency(expense.amount)}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${expense.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading other expenses:', error);
            const tbody = document.getElementById('otherExpensesTable');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">Error loading expenses</td></tr>';
        });
}

function updateDistrictExpensesTable() {
    // Fetch fresh data from backend
    Promise.all([
        fetch('/api/district-expenses').then(r => r.json()),
        fetch('/api/expenses?type=district').then(r => r.json())
    ]).then(([autoDistrictData, manualDistrictData]) => {
        const tbody = document.getElementById('districtExpensesTable');
        
        // Combine auto-generated and manual district expenses
        const allDistrictExpenses = [
            ...autoDistrictData.map(e => ({...e, amount: e.districtAmount, isAuto: true})),
            ...manualDistrictData.map(e => ({...e, isAuto: false}))
        ];
        
        if (allDistrictExpenses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No district expenses yet</td></tr>';
            return;
        }

        // Calculate total
        const total = allDistrictExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);

        tbody.innerHTML = allDistrictExpenses.map(expense => `
            <tr>
                <td>${formatDate(expense.date)}</td>
                <td>${expense.isAuto ? expense.source : expense.category}</td>
                <td>${expense.isAuto ? expense.source : expense.description}</td>
                <td>${formatCurrency(expense.amount)}</td>
                <td class="actions">
                    ${expense.isAuto ? 
                        `<span class="badge badge-warning">${expense.status}</span>` :
                        `<button class="btn btn-sm btn-danger delete-btn" data-id="${expense.id}">
                            <i class="fas fa-trash"></i>
                        </button>`
                    }
                </td>
            </tr>
        `).join('') + `
            <tr style="background-color: #f8f9fa; font-weight: bold; border-top: 2px solid #dee2e6;">
                <td colspan="3" style="text-align: right; padding-right: 10px;">Total District Expenses:</td>
                <td>${formatCurrency(total)}</td>
                <td></td>
            </tr>
        `;
    })
    .catch(error => {
        console.error('Error loading district expenses:', error);
        const tbody = document.getElementById('districtExpensesTable');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">Error loading district expenses</td></tr>';
    });
}

function updateNationalExpensesTable() {
    // Fetch fresh data from backend
    fetch('/api/expenses?type=national')
        .then(response => response.json())
        .then(nationalData => {
            const tbody = document.getElementById('nationalExpensesTable');
            
            if (nationalData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No national expenses yet</td></tr>';
                return;
            }

            // Calculate total
            const total = nationalData.reduce((sum, expense) => sum + (expense.amount || 0), 0);

            tbody.innerHTML = nationalData.map(expense => `
                <tr>
                    <td>${formatDate(expense.date)}</td>
                    <td>${expense.category}</td>
                    <td>${expense.description}</td>
                    <td>${formatCurrency(expense.amount)}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${expense.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('') + `
                <tr style="background-color: #f8f9fa; font-weight: bold; border-top: 2px solid #dee2e6;">
                    <td colspan="3" style="text-align: right; padding-right: 10px;">Total National Expenses:</td>
                    <td>${formatCurrency(total)}</td>
                    <td></td>
                </tr>
            `;
        })
        .catch(error => {
            console.error('Error loading national expenses:', error);
            const tbody = document.getElementById('nationalExpensesTable');
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">Error loading national expenses</td></tr>';
        });
}

function updateInventoryTable() {
    // Fetch fresh data from backend
    fetch('/api/inventory')
        .then(response => response.json())
        .then(inventoryData => {
            const tbody = document.getElementById('inventoryTable');
            
            if (inventoryData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">No inventory items yet</td></tr>';
                return;
            }

            tbody.innerHTML = inventoryData.map(item => `
                <tr>
                    <td>${item.itemName}</td>
                    <td>${item.category}</td>
                    <td>${item.quantity}</td>
                    <td><span class="badge badge-${getConditionClass(item.condition)}">${item.condition}</span></td>
                    <td>${formatDate(item.dateAdded)}</td>
                    <td class="actions">
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${item.id}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join('');
        })
        .catch(error => {
            console.error('Error loading inventory:', error);
            const tbody = document.getElementById('inventoryTable');
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #666;">Error loading inventory</td></tr>';
        });
}

function getConditionClass(condition) {
    switch(condition) {
        case 'Excellent': return 'success';
        case 'Good': return 'success';
        case 'Fair': return 'warning';
        case 'Poor': return 'danger';
        default: return 'secondary';
    }
}

// Dashboard updates
function updateDashboard() {
    // Fetch fresh data from backend instead of using localStorage
    Promise.all([
        fetch('/api/income').then(r => r.json()),
        fetch('/api/expenses').then(r => r.json()),
        fetch('/api/district-expenses').then(r => r.json()),
        fetch('/api/tithes').then(r => r.json())
    ]).then(([incomeData, expensesData, districtData, tithesData]) => {
        const today = new Date().toISOString().split('T')[0];
        
        // Calculate today's income from backend data (including all income)
        const todayIncome = incomeData
            .filter(item => item.date === today)
            .reduce((sum, item) => {
                if (item.is_tithe || item.is_offering) {
                    // For tithes and offerings, only count the local portion (23%)
                    return sum + (parseFloat(item.local_amount) || 0);
                } else {
                    // For other income, count the full amount as local
                    return sum + (parseFloat(item.amount) || 0);
                }
            }, 0);
        
        // Include today's tithes and offerings in income calculation
        const todayTithes = tithesData
            .filter(tithe => tithe.date === today)
            .reduce((sum, tithe) => {
                const totalTithe = (parseFloat(tithe.week1) || 0) + 
                                 (parseFloat(tithe.week2) || 0) + 
                                 (parseFloat(tithe.week3) || 0) + 
                                 (parseFloat(tithe.week4) || 0) + 
                                 (parseFloat(tithe.week5) || 0);
                // Only count 23% of tithes as local income
                return sum + (totalTithe * 0.23);
            }, 0);
        
        // Calculate total local income (23% of tithes/offerings + 100% of other income)
        const totalLocalIncome = todayIncome + todayTithes;
        
        // Calculate district allocation (77% of tithes and offerings)
        const todayDistrictAllocation = incomeData
            .filter(item => item.date === today && (item.is_tithe || item.is_offering))
            .reduce((sum, item) => sum + (parseFloat(item.district_amount) || 0), 0);
        
        // Add district allocation from tithes (77% of today's tithes)
        const todayTithesDistrict = tithesData
            .filter(tithe => tithe.date === today)
            .reduce((sum, tithe) => {
                const totalTithe = (parseFloat(tithe.week1) || 0) + 
                                 (parseFloat(tithe.week2) || 0) + 
                                 (parseFloat(tithe.week3) || 0) + 
                                 (parseFloat(tithe.week4) || 0) + 
                                 (parseFloat(tithe.week5) || 0);
                return sum + (totalTithe * 0.77);
            }, 0);
        
        const totalDistrictAllocation = todayDistrictAllocation + todayTithesDistrict;
        
        // Calculate total expenses (local only)
        const todayLocalExpenses = expensesData
            .filter(item => item.date === today && (item.expense_type === 'other' || !item.expense_type))
            .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
        
        // Total expenses include both local expenses and district allocation
        const totalTodayExpenses = todayLocalExpenses + totalDistrictAllocation;
        
        // Update dashboard
        setTimeout(() => {
            const localIncomeElement = document.getElementById('todayIncome');
            const districtAllocationElement = document.getElementById('districtAllocation');
            const expenseElement = document.getElementById('todayExpense');
            const balanceElement = document.getElementById('netBalance');
            
            console.log('Updating dashboard elements...');
            console.log('Local income element:', localIncomeElement);
            console.log('District allocation element:', districtAllocationElement);
            console.log('Expense element:', expenseElement);
            console.log('Balance element:', balanceElement);
            
            // Format currency values
            const formatCurrency = (value) => {
                return new Intl.NumberFormat('en-GH', {
                    style: 'currency',
                    currency: 'GHS',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }).format(value).replace('GHS', '₵');
            };
            
            if (localIncomeElement) {
                localIncomeElement.textContent = formatCurrency(totalLocalIncome);
                console.log('Updated local income to:', totalLocalIncome);
            } else {
                console.error('Local income element not found!');
            }
            
            if (districtAllocationElement) {
                districtAllocationElement.textContent = formatCurrency(totalDistrictAllocation);
                console.log('Updated district allocation to:', totalDistrictAllocation);
            } else {
                console.error('District allocation element not found!');
            }
            
            if (expenseElement) {
                expenseElement.textContent = formatCurrency(totalTodayExpenses);
                console.log('Updated expenses to:', totalTodayExpenses);
            } else {
                console.error('Expense element not found!');
            }
            
            if (balanceElement) {
                const netBalance = totalLocalIncome - totalTodayExpenses;
                balanceElement.textContent = formatCurrency(netBalance);
                console.log('Updated net balance to:', netBalance);
                
                // Update balance color based on value
                balanceElement.classList.toggle('text-danger', netBalance < 0);
                balanceElement.classList.toggle('text-success', netBalance >= 0);
                
                // Add tooltip to show the calculation
                balanceElement.title = `Local Income (₵${totalLocalIncome.toFixed(2)}) - 
                                    Total Expenses (₵${totalTodayExpenses.toFixed(2)}) = 
                                    Net Balance (₵${netBalance.toFixed(2)})`;
            } else {
                console.error('Balance element not found!');
            }
        }, 100);
    }).catch(error => {
        console.error('Error updating dashboard:', error);
        // Clear dashboard on error
        const incomeElement = document.getElementById('todayIncome');
        const districtElement = document.getElementById('districtAllocation');
        const expenseElement = document.getElementById('todayExpense');
        const balanceElement = document.getElementById('netBalance');
        
        if (incomeElement) incomeElement.textContent = formatCurrency(0);
        if (districtElement) districtElement.textContent = formatCurrency(0);
        if (expenseElement) expenseElement.textContent = formatCurrency(0);
        if (balanceElement) {
            balanceElement.textContent = formatCurrency(0);
            balanceElement.className = 'profit';
        }
    });
}

function updateRecentTransactions() {
    // Fetch fresh data from all endpoints
    Promise.all([
        fetch('/api/income').then(r => r.json()),
        fetch('/api/expenses').then(r => r.json()),
        fetch('/api/district-expenses').then(r => r.json()),
        fetch('/api/national-expenses').then(r => r.json()),
        fetch('/api/tithes').then(r => r.json()),
        fetch('/api/offerings').then(r => r.json())
    ]).then(([incomeData, expensesData, districtData, nationalData, tithesData, offeringsData]) => {
        const tbody = document.getElementById('recentTransactions');
        
        // Process tithes data
        const titheTransactions = tithesData.flatMap(tithe => {
            const transactions = [];
            const titheDate = tithe.date || new Date().toISOString().split('T')[0];
            const memberName = tithe.member_name || 'Member';
            const totalTithe = (parseFloat(tithe.week1) || 0) + (parseFloat(tithe.week2) || 0) + 
                             (parseFloat(tithe.week3) || 0) + (parseFloat(tithe.week4) || 0) + 
                             (parseFloat(tithe.week5) || 0);
            
            if (totalTithe > 0) {
                // Add local portion (23%)
                transactions.push({
                    date: titheDate,
                    type: 'Tithe (Local)',
                    description: `Tithe - ${memberName}`,
                    amount: totalTithe * 0.23,
                    status: 'Completed'
                });
                
                // Add district allocation (77%)
                transactions.push({
                    date: titheDate,
                    type: 'Tithe (District)',
                    description: `Tithe Allocation - ${memberName}`,
                    amount: totalTithe * 0.77,
                    status: 'Allocated'
                });
            }
            
            return transactions;
        });
        
        // Process offerings data
        const offeringTransactions = offeringsData.flatMap(offering => {
            const transactions = [];
            const offeringDate = offering.date || new Date().toISOString().split('T')[0];
            const source = offering.memberName === 'General Offering' ? 'General' : offering.memberName;
            const totalOffering = (parseFloat(offering.week1) || 0) + (parseFloat(offering.week2) || 0) + 
                                (parseFloat(offering.week3) || 0) + (parseFloat(offering.week4) || 0) + 
                                (parseFloat(offering.week5) || 0);
            
            if (totalOffering > 0) {
                // Add local portion (23%)
                transactions.push({
                    date: offeringDate,
                    type: 'Offering (Local)',
                    description: `Offering - ${source}`,
                    amount: totalOffering * 0.23,
                    status: 'Completed'
                });
                
                // Add district allocation (77%)
                transactions.push({
                    date: offeringDate,
                    type: 'Offering (District)',
                    description: `Offering Allocation - ${source}`,
                    amount: totalOffering * 0.77,
                    status: 'Allocated'
                });
            }
            
            return transactions;
        });
        
        // Process income data
        const incomeTransactions = incomeData.map(income => ({
            ...income,
            type: income.is_tithe ? 'Tithe' : (income.is_offering ? 'Offering' : 'Income'),
            description: income.description || (income.is_tithe ? 'Tithe' : (income.is_offering ? 'Offering' : 'Income')),
            amount: income.amount || 0,
            status: 'Completed'
        }));
        
        // Process expenses data
        const expenseTransactions = expensesData.map(expense => ({
            ...expense,
            type: 'Expense',
            description: expense.description || 'Expense',
            amount: expense.amount || 0,
            status: 'Completed'
        }));
        
        // Process district expenses
        const districtExpenseTransactions = districtData.map(expense => ({
            ...expense,
            type: 'District Expense',
            description: expense.description || 'District Allocation',
            amount: expense.amount || 0,
            status: expense.status || 'Completed'
        }));
        
        // Process national expenses
        const nationalExpenseTransactions = nationalData.map(expense => ({
            ...expense,
            type: 'National Expense',
            description: expense.description || 'National Allocation',
            amount: expense.amount || 0,
            status: 'Completed'
        }));
        
        // Combine all transactions and sort by date (newest first)
        const allTransactions = [
            ...incomeTransactions,
            ...titheTransactions,
            ...offeringTransactions,
            ...expenseTransactions,
            ...districtExpenseTransactions,
            ...nationalExpenseTransactions
        ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10); // Show last 10 transactions

        if (allTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No transactions found</td></tr>';
            return;
        }

        // Generate table rows
        tbody.innerHTML = allTransactions.map(transaction => {
            // Determine badge class based on transaction type
            let badgeClass = 'secondary';
            if (transaction.type.includes('Tithe')) badgeClass = 'info';
            else if (transaction.type.includes('Offering')) badgeClass = 'success';
            else if (transaction.type === 'Income') badgeClass = 'primary';
            else if (transaction.type === 'Expense') badgeClass = 'danger';
            else if (transaction.type === 'District Expense') badgeClass = 'warning';
            else if (transaction.type === 'National Expense') badgeClass = 'danger';
            
            // Determine status class
            const statusClass = transaction.status === 'Completed' ? 'success' : 
                              transaction.status === 'Pending' ? 'warning' :
                              transaction.status === 'Allocated' ? 'info' : 'secondary';
            
            return `
                <tr>
                    <td>${formatDate(transaction.date)}</td>
                    <td><span class="badge badge-${badgeClass}">${transaction.type}</span></td>
                    <td>${transaction.description}</td>
                    <td>${formatCurrency(transaction.amount)}</td>
                    <td><span class="badge badge-${statusClass}">${transaction.status}</span></td>
                </tr>
            `;
        }).join('');
    }).catch(error => {
        console.error('Error updating recent transactions:', error);
        const tbody = document.getElementById('recentTransactions');
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">No transactions yet</td></tr>';
    });
}

// Expense category functions
function showExpenseCategory(category) {
    // Hide all expense sections
    document.getElementById('otherExpenses').style.display = 'none';
    document.getElementById('districtExpenses').style.display = 'none';
    document.getElementById('nationalExpenses').style.display = 'none';

    // Show selected section
    document.getElementById(category + 'Expenses').style.display = 'block';

    // Update button states
    document.querySelectorAll('[id$="ExpenseBtn"]').forEach(btn => {
        btn.classList.remove('btn-primary', 'btn-warning', 'btn-danger');
        btn.classList.add('btn-primary');
    });

    const activeBtn = document.getElementById(category + 'ExpenseBtn');
    activeBtn.classList.remove('btn-primary');
    if (category === 'other') activeBtn.classList.add('btn-primary');
    if (category === 'district') activeBtn.classList.add('btn-warning');
    if (category === 'national') activeBtn.classList.add('btn-danger');
}

// Report functions
function showReport(reportType) {
    // Hide all reports
    document.getElementById('weeklyReport').style.display = 'none';
    document.getElementById('monthlyReport').style.display = 'none';
    document.getElementById('yearlyReport').style.display = 'none';
    document.getElementById('plReport').style.display = 'none';

    // Show selected report
    document.getElementById(reportType + 'Report').style.display = 'block';

    // Update button states
    document.querySelectorAll('[id$="ReportBtn"]').forEach(btn => {
        btn.classList.remove('btn-primary', 'btn-warning', 'btn-danger', 'btn-success');
        btn.classList.add('btn-primary');
    });

    const activeBtn = document.getElementById(reportType + 'ReportBtn');
    activeBtn.classList.remove('btn-primary');
    if (reportType === 'weekly') activeBtn.classList.add('btn-primary');
    if (reportType === 'monthly') activeBtn.classList.add('btn-warning');
    if (reportType === 'yearly') activeBtn.classList.add('btn-danger');
    if (reportType === 'pl') activeBtn.classList.add('btn-success');
    
    // Update reports when showing them
    updateReports();
}

async function updateReports() {
    try {
        // Fetch data from the backend
        const [incomeResponse, expensesResponse] = await Promise.all([
            fetch('/api/income').then(r => r.json()),
            fetch('/api/expenses?type=other').then(r => r.json())
        ]);

        // Safely access response data with fallback to empty arrays
        const incomeData = (incomeResponse && incomeResponse.data) || [];
        const expensesData = (expensesResponse && expensesResponse.data) || [];
        
        // Filter out tithes and offerings from income data
        const filteredIncomeData = incomeData.filter(item => 
            item && !item.is_tithe && !item.is_offering
        );

        console.log('Reports Data:', { 
            incomeData: filteredIncomeData, 
            expensesData 
        });

        const now = new Date();
        const thisWeek = getWeekRange(now);
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();

        // Process income data for reports
        const allIncomeData = [];
        const allExpensesData = [];

        // Process income items
        filteredIncomeData.forEach((income, index) => {
            if (!income) {
                console.warn(`Skipping null/undefined income at index ${index}`);
                return;
            }
            
            try {
                const amount = parseFloat(income.amount || 0);
                if (isNaN(amount)) {
                    console.warn(`Invalid amount for income at index ${index}:`, income);
                    return;
                }
                
                let incomeDate = income.date;
                if (!incomeDate) {
                    console.warn(`Missing date for income at index ${index}, using current date`);
                    incomeDate = new Date().toISOString().split('T')[0];
                } else if (incomeDate.includes('T')) {
                    incomeDate = incomeDate.split('T')[0];
                }
                
                const localAmount = amount * 0.23;
                
                allIncomeData.push({
                    date: incomeDate,
                    category: income.category || 'Income',
                    description: income.description || 'Income Entry',
                    amount: parseFloat(localAmount.toFixed(2)),
                    id: income.id,
                    isLocal: true,
                    totalAmount: parseFloat(income.amount),
                    districtAmount: parseFloat(income.district_amount || (income.amount * 0.77).toFixed(2)),
                    localAmount: parseFloat(localAmount.toFixed(2))
                });
            } catch (error) {
                console.error(`Error processing income at index ${index}:`, error, income);
            }
        });

        // Process expenses
        expensesData.forEach((expense, index) => {
            if (!expense) {
                console.warn(`Skipping null/undefined expense at index ${index}`);
                return;
            }
            
            try {
                const amount = parseFloat(expense.amount || 0);
                if (isNaN(amount)) {
                    console.warn(`Invalid amount for expense at index ${index}:`, expense);
                    return;
                }
                
                let expenseDate = expense.date;
                if (!expenseDate) {
                    console.warn(`Missing date for expense at index ${index}, using current date`);
                    expenseDate = new Date().toISOString().split('T')[0];
                } else if (expenseDate.includes('T')) {
                    expenseDate = expenseDate.split('T')[0];
                }
                
                allExpensesData.push({
                    date: expenseDate,
                    category: expense.category || 'Expense',
                    description: expense.description || 'Expense Entry',
                    amount: amount,
                    id: expense.id,
                    type: expense.type || 'other'
                });
            } catch (error) {
                console.error(`Error processing expense at index ${index}:`, error, expense);
            }
        });

        // Calculate totals
        const calculateTotals = (data, dateFilter) => {
            return data.reduce((acc, item) => {
                try {
                    const itemDate = new Date(item.date);
                    if (dateFilter(itemDate)) {
                        acc.total += parseFloat(item.amount) || 0;
                        acc.count++;
                    }
                } catch (error) {
                    console.error('Error processing date:', item.date, error);
                }
                return acc;
            }, { total: 0, count: 0 });
        };

        // Filter and calculate data for different time periods
        const weeklyIncomeData = allIncomeData.filter(i => {
            try { return new Date(i.date) >= thisWeek.start && new Date(i.date) <= thisWeek.end; } 
            catch { return false; }
        });
        
        const weeklyExpenseData = allExpensesData.filter(e => {
            try { return new Date(e.date) >= thisWeek.start && new Date(e.date) <= thisWeek.end; } 
            catch { return false; }
        });
        
        const monthlyIncomeData = allIncomeData.filter(i => {
            try { return new Date(i.date).getMonth() === thisMonth && new Date(i.date).getFullYear() === thisYear; } 
            catch { return false; }
        });
        
        const monthlyExpenseData = allExpensesData.filter(e => {
            try { return new Date(e.date).getMonth() === thisMonth && new Date(e.date).getFullYear() === thisYear; } 
            catch { return false; }
        });
        
        const yearlyIncomeData = allIncomeData.filter(i => {
            try { return new Date(i.date).getFullYear() === thisYear; } 
            catch { return false; }
        });
        
        const yearlyExpenseData = allExpensesData.filter(e => {
            try { return new Date(e.date).getFullYear() === thisYear; } 
            catch { return false; }
        });

        // Calculate totals for display
        const weeklyIncome = weeklyIncomeData.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const weeklyExpense = weeklyExpenseData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const monthlyIncome = monthlyIncomeData.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const monthlyExpense = monthlyExpenseData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
        const yearlyIncome = yearlyIncomeData.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
        const yearlyExpense = yearlyExpenseData.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);

        // Update report cards
        const updateReportCard = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = formatCurrency(Number(value) || 0);
                console.log(`Updated ${id} card:`, formatCurrency(Number(value) || 0));
            }
        };

        // Update weekly report cards
        updateReportCard('weeklyIncome', weeklyIncome);
        updateReportCard('weeklyExpense', weeklyExpense);
        updateReportCard('weeklyBalance', weeklyIncome - weeklyExpense);

        // Update monthly report cards
        updateReportCard('monthlyIncome', monthlyIncome);
        updateReportCard('monthlyExpense', monthlyExpense);
        updateReportCard('monthlyBalance', monthlyIncome - monthlyExpense);

        // Update yearly report cards
        updateReportCard('yearlyIncome', yearlyIncome);
        updateReportCard('yearlyExpense', yearlyExpense);
        updateReportCard('yearlyBalance', yearlyIncome - yearlyExpense);

        // Update the dashboard
        updateDashboard();
        // Update report displays immediately
        const weeklyIncomeEl = document.getElementById('weeklyIncome');
        const weeklyExpenseEl = document.getElementById('weeklyExpense');
        const weeklyBalanceEl = document.getElementById('weeklyBalance');
        
        if (weeklyIncomeEl) {
            weeklyIncomeEl.textContent = formatCurrency(weeklyIncome);
            console.log('Updated weekly income card:', formatCurrency(weeklyIncome));
        }
        if (weeklyExpenseEl) {
            weeklyExpenseEl.textContent = formatCurrency(weeklyLocalExpense);
            console.log('Updated weekly expense card:', formatCurrency(weeklyLocalExpense));
        }
        if (weeklyBalanceEl) {
            weeklyBalanceEl.textContent = formatCurrency(weeklyIncome - weeklyLocalExpense);
            console.log('Updated weekly balance card:', formatCurrency(weeklyIncome - weeklyLocalExpense));
        }

        const monthlyIncomeEl = document.getElementById('monthlyIncome');
        const monthlyExpenseEl = document.getElementById('monthlyExpense');
        const monthlyBalanceEl = document.getElementById('monthlyBalance');
        
        if (monthlyIncomeEl) {
            monthlyIncomeEl.textContent = formatCurrency(monthlyIncome);
            console.log('Updated monthly income card:', formatCurrency(monthlyIncome));
        }
        if (monthlyExpenseEl) {
            monthlyExpenseEl.textContent = formatCurrency(monthlyExpense);
            console.log('Updated monthly expense card:', formatCurrency(monthlyExpense));
        }
        if (monthlyBalanceEl) {
            monthlyBalanceEl.textContent = formatCurrency(monthlyIncome - monthlyExpense);
            console.log('Updated monthly balance card:', formatCurrency(monthlyIncome - monthlyExpense));
        }

        const yearlyIncomeEl = document.getElementById('yearlyIncome');
        const yearlyExpenseEl = document.getElementById('yearlyExpense');
        const yearlyBalanceEl = document.getElementById('yearlyBalance');
        
        if (yearlyIncomeEl) {
            yearlyIncomeEl.textContent = formatCurrency(yearlyIncome);
            console.log('Updated yearly income card:', formatCurrency(yearlyIncome));
        }
        if (yearlyExpenseEl) {
            yearlyExpenseEl.textContent = formatCurrency(yearlyExpense);
            console.log('Updated yearly expense card:', formatCurrency(yearlyExpense));
        }
        if (yearlyBalanceEl) {
            yearlyBalanceEl.textContent = formatCurrency(yearlyIncome - yearlyExpense);
            console.log('Updated yearly balance card:', formatCurrency(yearlyIncome - yearlyExpense));
        }

        // Update report tables with timeout to ensure DOM is ready
        setTimeout(() => {
            try {
                updateReportTable('weeklyIncomeTable', weeklyIncomeData, 'income');
                updateReportTable('weeklyExpenseTable', weeklyExpenseData, 'expense');
                updateReportTable('monthlyIncomeTable', monthlyIncomeData, 'income');
                updateReportTable('monthlyExpenseTable', monthlyExpenseData, 'expense');
                updateReportTable('yearlyIncomeTable', yearlyIncomeData, 'income');
                updateReportTable('yearlyExpenseTable', yearlyExpenseData, 'expense');
                
                // Update P&L Statement
                updatePLStatement();
            } catch (error) {
                console.error('Error in report update:', error);
            }
        }, 100);
    } catch (error) {
        console.error('Error updating reports:', error);
    }
}

function updateReportTable(tableId, data, type) {
    const tbody = document.getElementById(tableId);
    
    console.log(`Updating ${tableId} with ${data.length} items`, data);
    
    if (!tbody) {
        console.error(`Table element ${tableId} not found!`);
        return;
    }
    
    if (data.length === 0) {
        const colSpan = type === 'income' ? '4' : '5';
        tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align: center; color: #666;">No ${type} transactions</td></tr>`;
        console.log(`${tableId} set to empty state`);
        return;
    }
    
    // Sort by date (newest first) - handle null/undefined dates
    data.sort((a, b) => {
        const dateA = a.date ? new Date(a.date) : new Date(0);
        const dateB = b.date ? new Date(b.date) : new Date(0);
        return dateB - dateA;
    });
    
    try {
        if (type === 'income') {
            const html = data.map(item => {
                const date = item.date || 'N/A';
                const category = item.category || 'N/A';
                const description = item.description || 'N/A';
                const amount = item.amount || 0;
                
                return `
                    <tr>
                        <td>${formatDate(date)}</td>
                        <td>${category}</td>
                        <td>${description}</td>
                        <td>${formatCurrency(amount)}</td>
                    </tr>
                `;
            }).join('');
            
            tbody.innerHTML = html;
            console.log(`${tableId} income HTML set:`, html.substring(0, 200) + '...');
        } else {
            const html = data.map(item => {
                const date = item.date || 'N/A';
                const category = item.category || 'N/A';
                const description = item.description || 'N/A';
                const amount = item.amount || 0;
                const expenseType = item.expense_type || 'Local';
                
                return `
                    <tr>
                        <td>${formatDate(date)}</td>
                        <td>${category}</td>
                        <td>${description}</td>
                        <td>${formatCurrency(amount)}</td>
                        <td><span class="badge ${item.expense_type === 'district' ? 'badge-warning' : item.expense_type === 'national' ? 'badge-danger' : 'badge-secondary'}">${expenseType}</span></td>
                    </tr>
                `;
            }).join('');
            
            tbody.innerHTML = html;
            console.log(`${tableId} expense HTML set:`, html.substring(0, 200) + '...');
        }
        
        console.log(`${tableId} updated successfully with ${data.length} rows`);
    } catch (error) {
        console.error(`Error updating ${tableId}:`, error);
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ff0000;">Error loading ${type} data</td></tr>`;
    }
}

function updatePLStatement() {
    // Fetch fresh data from backend instead of using localStorage
    Promise.all([
        fetch('/api/income').then(r => r.json()),
        fetch('/api/expenses').then(r => r.json()),
        fetch('/api/district-expenses').then(r => r.json()),
        fetch('/api/tithes').then(r => r.json()),
        fetch('/api/offerings').then(r => r.json())
    ]).then(([incomeData, expensesData, districtData, tithesData, offeringsData]) => {
        console.log('=== P&L STATEMENT UPDATE ===');
        console.log('P&L Income data:', incomeData);
        console.log('P&L Tithes data:', tithesData);
        console.log('P&L Offerings data:', offeringsData);
        
        // Calculate total income from all sources
        let totalIncome = 0;
        
        // Add regular income entries (excluding duplicates)
        incomeData.forEach(income => {
            if (income.amount && income.amount > 0 && 
                income.category !== '23% (of tithe and offering)' && 
                income.category !== 'Tithe' && 
                income.category !== 'Offering') {
                totalIncome += parseFloat(income.amount);
            }
        });
        
        // Add tithes - calculate from weekly amounts if total is missing
        tithesData.forEach(tithe => {
            let titheTotal = tithe.total || 0;
            if (titheTotal === 0) {
                titheTotal = (tithe.week1 || 0) + (tithe.week2 || 0) + (tithe.week3 || 0) + (tithe.week4 || 0) + (tithe.week5 || 0);
            }
            if (titheTotal > 0) {
                totalIncome += parseFloat(titheTotal);
            }
        });
        
        // Add offerings - calculate from weekly amounts if total is missing
        offeringsData.forEach(offering => {
            let offeringTotal = offering.total || 0;
            if (offeringTotal === 0) {
                offeringTotal = (offering.week1 || 0) + (offering.week2 || 0) + (offering.week3 || 0) + (offering.week4 || 0) + (offering.week5 || 0);
            }
            if (offeringTotal > 0) {
                totalIncome += parseFloat(offeringTotal);
            }
        });
        
        console.log('P&L Total calculated income:', totalIncome);
        
        // Calculate expenses by type
        const localExpenses = expensesData.filter(e => e.expense_type === 'other' || !e.expense_type).reduce((sum, e) => sum + (e.amount || 0), 0);
        const manualDistrictExpenses = expensesData.filter(e => e.expense_type === 'district').reduce((sum, e) => sum + (e.amount || 0), 0);
        const nationalExpenses = expensesData.filter(e => e.expense_type === 'national').reduce((sum, e) => sum + (e.amount || 0), 0);
        const autoDistrictExpenses = districtData.reduce((sum, e) => sum + (e.districtAmount || 0), 0);
        
        const totalExpenses = localExpenses + nationalExpenses;
        const netProfitLoss = totalIncome - totalExpenses;

        // Update P&L display
        document.getElementById('localIncome').textContent = formatCurrency(totalIncome);
        document.getElementById('localIncomeBalance').textContent = formatCurrency(totalIncome);
        document.getElementById('districtExpense').textContent = formatCurrency(0);
        document.getElementById('districtExpenseBalance').textContent = formatCurrency(0);
        document.getElementById('otherExpenseTotal').textContent = formatCurrency(localExpenses + nationalExpenses);
        document.getElementById('otherExpenseBalance').textContent = formatCurrency(-(localExpenses + nationalExpenses));
        document.getElementById('netProfitLoss').textContent = formatCurrency(netProfitLoss);
        
        console.log('P&L Statement updated - Income:', formatCurrency(totalIncome), 'Expenses:', formatCurrency(totalExpenses), 'Net:', formatCurrency(netProfitLoss));

        // Color code the net profit/loss
        const netElement = document.getElementById('netProfitLoss');
        if (netProfitLoss >= 0) {
            netElement.style.color = '#28a745';
        } else {
            netElement.style.color = '#dc3545';
        }
    }).catch(error => {
        console.error('Error updating P&L:', error);
    });
}

// Utility functions
function getWeekRange(date) {
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function isInDateRange(dateString, startDate, endDate) {
    return dateString >= startDate && dateString <= endDate;
}

// Delete functions
async function deleteIncome(id) {
    if (!confirm('Are you sure you want to delete this income record?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/income/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateIncomeTable();
            updateDashboard();
            updateTithesAndOfferingsSummary();
            showNotification('Income record deleted successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to delete income record', 'error');
        }
    } catch (error) {
        console.error('Error deleting income:', error);
        showNotification('An error occurred while deleting the income record', 'error');
    }
}

async function deleteTithe(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this tithe record?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/tithes/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const result = await response.json();
        
        if (result.success) {
            const month = parseInt(document.getElementById('monthSelector').value);
            updateTithesTable(month);
            updateDashboard();
            updateTithesAndOfferingsSummary();
            showNotification('Tithe record deleted successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to delete tithe record', 'error');
        }
    } catch (error) {
        console.error('Error deleting tithe:', error);
        showNotification('An error occurred while deleting the tithe record', 'error');
    }
}

async function deleteExpense(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this expense record?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateExpensesTable();
            updateDashboard();
            showNotification('Expense record deleted successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to delete expense record', 'error');
        }
    } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('An error occurred while deleting the expense record', 'error');
    }
}

async function deleteInventory(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this inventory item?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/inventory/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateInventoryTable();
            showNotification('Inventory item deleted successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to delete inventory item', 'error');
        }
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        showNotification('An error occurred while deleting the inventory item', 'error');
    }
}

async function deleteDistrictExpense(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this district expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateDistrictExpensesTable();
            updateDashboard();
            updateTithesAndOfferingsSummary();
            showNotification('District expense deleted successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to delete district expense', 'error');
        }
    } catch (error) {
        console.error('Error deleting district expense:', error);
        showNotification('An error occurred while deleting the district expense', 'error');
    }
}

async function deleteNationalExpense(id, event) {
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Are you sure you want to delete this national expense?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/expenses/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        
        const result = await response.json();
        
        if (result.success) {
            updateNationalExpensesTable();
            updateDashboard();
            showNotification('National expense deleted successfully!', 'success');
        } else {
            showNotification(result.message || 'Failed to delete national expense', 'error');
        }
    } catch (error) {
        console.error('Error deleting national expense:', error);
        showNotification('An error occurred while deleting the national expense', 'error');
    }
}

// Data persistence
function saveData() {
    localStorage.setItem('churchManagementData', JSON.stringify(currentData));
}

async function loadData() {
    try {
        // Load data from backend APIs
        const [
            incomeResponse, 
            tithesResponse, 
            expensesResponse, 
            districtExpensesResponse, 
            nationalExpensesResponse, 
            inventoryResponse
        ] = await Promise.all([
            fetch('/api/income').then(r => r.ok ? r.json() : Promise.reject('Failed to load income')),
            fetch('/api/tithes').then(r => r.ok ? r.json() : Promise.reject('Failed to load tithes')),
            fetch('/api/expenses?type=other').then(r => r.ok ? r.json() : Promise.reject('Failed to load expenses')),
            fetch('/api/district-expenses').then(r => r.ok ? r.json() : Promise.reject('Failed to load district expenses')),
            fetch('/api/expenses?type=national').then(r => r.ok ? r.json() : Promise.reject('Failed to load national expenses')),
            fetch('/api/inventory').then(r => r.ok ? r.json() : Promise.reject('Failed to load inventory'))
        ]);

        // Update currentData with the fetched data
        currentData = {
            income: incomeResponse || [],
            tithes: tithesResponse || [],
            expenses: expensesResponse || [],
            districtExpenses: districtExpensesResponse || [],
            nationalExpenses: nationalExpensesResponse || [],
            inventory: inventoryResponse || []
        };

        // Update all tables with the new data
        updateIncomeTable();
        updateTithesTable(new Date().getMonth());
        updateExpensesTable();
        updateDistrictExpensesTable();
        updateInventoryTable();
        updateDashboard();
        updateRecentTransactions();
        
        return currentData;
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Error loading data: ' + (error.message || error), 'error');
        throw error; // Re-throw to allow calling code to handle the error
    }
}

// Export functions
function exportData() {
    showNotification('Preparing Excel export...', 'success');
    
    // Create a temporary link to trigger the download
    const link = document.createElement('a');
    link.href = '/api/export';
    link.download = ''; // Filename will be set by the server
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show success message after a short delay
    setTimeout(() => {
        showNotification('Excel report downloaded successfully!', 'success');
    }, 1000);
}

function exportPDF() {
    showNotification('Preparing PDF export...', 'success');
    
    // Use fetch to handle the PDF download properly
    fetch('/api/export-pdf')
        .then(response => {
            if (!response.ok) {
                throw new Error('PDF generation failed');
            }
            return response.blob();
        })
        .then(blob => {
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Church_Report_${new Date().toISOString().split('T')[0]}.pdf`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Clean up the URL object
            window.URL.revokeObjectURL(url);
            
            showNotification('PDF report downloaded successfully!', 'success');
        })
        .catch(error => {
            console.error('PDF export error:', error);
            showNotification('PDF export failed. Please try again.', 'error');
        });
}

// Report functions
function showReport(type) {
    // Hide all reports
    document.getElementById('weeklyReport').style.display = 'none';
    document.getElementById('monthlyReport').style.display = 'none';
    document.getElementById('yearlyReport').style.display = 'none';
    document.getElementById('plReport').style.display = 'none';
    
    // Remove active class from all buttons
    document.querySelectorAll('[id$="ReportBtn"]').forEach(btn => {
        btn.classList.remove('btn-active');
    });
    
    // Show selected report and activate button
    document.getElementById(type + 'Report').style.display = 'block';
    document.getElementById(type + 'ReportBtn').classList.add('btn-active');
    
    // Update report data
    updateReportData(type);
}

function updateReportData(type) {
    const now = new Date();
    let startDate, endDate;
    
    switch(type) {
        case 'weekly':
            const startOfWeek = new Date(now);
            startOfWeek.setDate(now.getDate() - now.getDay());
            startDate = startOfWeek.toISOString().split('T')[0];
            endDate = now.toISOString().split('T')[0];
            updateWeeklyReport(startDate, endDate);
            break;
        case 'monthly':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            updateMonthlyReport(startDate, endDate);
            break;
        case 'yearly':
            startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
            endDate = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
            updateYearlyReport(startDate, endDate);
            break;
        case 'pl':
            updatePLReport();
            break;
    }
}

function updateWeeklyReport(startDate, endDate) {
    const weeklyIncome = currentData.income.filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    const weeklyExpenses = currentData.expenses.filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    const weeklyNationalExpenses = (currentData.nationalExpenses || []).filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    
    const totalIncome = weeklyIncome.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const regularExpenses = weeklyExpenses.reduce((sum, item) => sum + item.amount, 0);
    const nationalExpenses = weeklyNationalExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = regularExpenses + nationalExpenses;
    
    document.getElementById('weeklyIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('weeklyExpense').textContent = formatCurrency(totalExpenses);
    document.getElementById('weeklyBalance').textContent = formatCurrency(totalIncome - totalExpenses);
    
    // Update transaction tables
    updateReportTable('weeklyIncomeTable', weeklyIncome, 'income');
    updateReportTable('weeklyExpenseTable', [...weeklyExpenses, ...weeklyNationalExpenses], 'expense');
}

function updateMonthlyReport(startDate, endDate) {
    const monthlyIncome = currentData.income.filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    const monthlyExpenses = currentData.expenses.filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    const monthlyNationalExpenses = (currentData.nationalExpenses || []).filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    
    const totalIncome = monthlyIncome.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const regularExpenses = monthlyExpenses.reduce((sum, item) => sum + item.amount, 0);
    const nationalExpenses = monthlyNationalExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = regularExpenses + nationalExpenses;
    
    document.getElementById('monthlyIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('monthlyExpense').textContent = formatCurrency(totalExpenses);
    document.getElementById('monthlyBalance').textContent = formatCurrency(totalIncome - totalExpenses);
    
    // Update transaction tables
    updateReportTable('monthlyIncomeTable', monthlyIncome, 'income');
    updateReportTable('monthlyExpenseTable', [...monthlyExpenses, ...monthlyNationalExpenses], 'expense');
}

function updateYearlyReport(startDate, endDate) {
    const yearlyIncome = currentData.income.filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    const yearlyExpenses = currentData.expenses.filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    const yearlyNationalExpenses = (currentData.nationalExpenses || []).filter(item => 
        item.date >= startDate && item.date <= endDate
    );
    
    const totalIncome = yearlyIncome.reduce((sum, item) => sum + (item.amount || 0), 0);
    
    const regularExpenses = yearlyExpenses.reduce((sum, item) => sum + item.amount, 0);
    const nationalExpenses = yearlyNationalExpenses.reduce((sum, item) => sum + item.amount, 0);
    const totalExpenses = regularExpenses + nationalExpenses;
    
    document.getElementById('yearlyIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('yearlyExpense').textContent = formatCurrency(totalExpenses);
    document.getElementById('yearlyBalance').textContent = formatCurrency(totalIncome - totalExpenses);
    
    // Update transaction tables
    updateReportTable('yearlyIncomeTable', yearlyIncome, 'income');
    updateReportTable('yearlyExpenseTable', [...yearlyExpenses, ...yearlyNationalExpenses], 'expense');
}

function updateReportTable(tableId, data, type) {
    const tbody = document.getElementById(tableId);
    
    if (data.length === 0) {
        const period = tableId.includes('weekly') ? 'week' : tableId.includes('monthly') ? 'month' : 'year';
        const transType = type === 'income' ? 'transactions' : 'expenses';
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #666;">No ${transType} this ${period}</td></tr>`;
        return;
    }
    
    if (type === 'income') {
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${formatDate(item.date)}</td>
                <td>${item.category}</td>
                <td>${item.description}</td>
                <td>${formatCurrency(item.amount)}</td>
                <td>${formatCurrency(item.local_amount || item.amount)}</td>
            </tr>
        `).join('');
    } else {
        tbody.innerHTML = data.map(item => `
            <tr>
                <td>${formatDate(item.date)}</td>
                <td>${item.category}</td>
                <td>${item.description}</td>
                <td>${formatCurrency(item.amount)}</td>
                <td>${item.expense_type || 'Other'}</td>
            </tr>
        `).join('');
    }
}

function updatePLStatement() {
    // Calculate revenue by category including tithes
    const revenueByCategory = {};
    const expensesByCategory = {};
    let totalRevenue = 0;
    
    // Only show income amounts that are actually posted (23% for tithes, full amount for others)
    currentData.income.forEach(item => {
        if (revenueByCategory[item.category]) {
            revenueByCategory[item.category] += (item.local_amount || item.amount);
        } else {
            revenueByCategory[item.category] = (item.local_amount || item.amount);
        }
        totalRevenue += (item.local_amount || item.amount);
    });
    
    let totalExpenses = 0;
    
    // Regular expenses
    currentData.expenses.forEach(item => {
        if (expensesByCategory[item.category]) {
            expensesByCategory[item.category] += item.amount;
        } else {
            expensesByCategory[item.category] = item.amount;
        }
        totalExpenses += item.amount;
    });
    
    // District expenses removed from P&L calculations
    
    // National expenses
    const nationalTotal = (currentData.nationalExpenses || []).reduce((sum, item) => sum + item.amount, 0);
    if (nationalTotal > 0) {
        expensesByCategory['National Expenses'] = nationalTotal;
        totalExpenses += nationalTotal;
    }
    
    // Populate revenue table
    const revenueTable = document.getElementById('revenueTable');
    revenueTable.innerHTML = Object.entries(revenueByCategory).map(([category, amount]) => `
        <tr>
            <td>${category}</td>
            <td>${formatCurrency(amount)}</td>
        </tr>
    `).join('');
    
    // Populate expenses table
    const expensesTable = document.getElementById('expensesTable');
    expensesTable.innerHTML = Object.entries(expensesByCategory).map(([category, amount]) => `
        <tr>
            <td>${category}</td>
            <td>${formatCurrency(amount)}</td>
        </tr>
    `).join('');
    
    // Update totals
    document.getElementById('totalRevenue').textContent = formatCurrency(totalRevenue);
    document.getElementById('totalExpenses').textContent = formatCurrency(totalExpenses);
    
    // Calculate and display net profit/loss
    const netBalance = totalRevenue - totalExpenses;
    const netElement = document.getElementById('netProfitLoss');
    netElement.textContent = formatCurrency(Math.abs(netBalance));
    netElement.style.color = netBalance >= 0 ? '#28a745' : '#dc3545';
    
    // Populate transaction details
    updatePLTransactionTables();
}

function updatePLTransactionTables() {
    // Income transactions (only show amounts that are actually posted as income - 23% for tithes)
    const allIncome = currentData.income.map(i => ({
        date: i.date,
        category: i.category,
        description: i.description,
        amount: i.local_amount || i.amount
    }));
    
    const incomeTable = document.getElementById('plIncomeTransactions');
    if (allIncome.length === 0) {
        incomeTable.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">No income transactions</td></tr>';
    } else {
        incomeTable.innerHTML = allIncome.map(item => `
            <tr>
                <td>${formatDate(item.date)}</td>
                <td>${item.category}</td>
                <td>${item.description}</td>
                <td>${formatCurrency(item.amount)}</td>
            </tr>
        `).join('');
    }
    
    // Expense transactions (combine all expense types)
    const allExpenses = [
        ...currentData.expenses.map(e => ({...e, type: 'Local'})),
        ...(currentData.nationalExpenses || []).map(e => ({...e, type: 'National'}))
    ];
    
    const expenseTable = document.getElementById('plExpenseTransactions');
    if (allExpenses.length === 0) {
        expenseTable.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">No expense transactions</td></tr>';
    } else {
        expenseTable.innerHTML = allExpenses.map(item => `
            <tr>
                <td>${formatDate(item.date)}</td>
                <td>${item.category}</td>
                <td>${item.description}</td>
                <td>${formatCurrency(item.amount)}</td>
            </tr>
        `).join('');
    }
}

// Year Reset Functions
function confirmYearReset() {
    performYearReset();
}

function performYearReset() {
    fetch('/api/year-reset', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Year reset response:', data);
        if (data.success) {
            showNotification('Year reset completed successfully!', 'success');
            // Refresh data
            loadData();
            updateDashboard();
            updateRecentTransactions();
        } else {
            console.error('Year reset failed:', data.message);
        }
    })
    .catch(error => {
        console.error('Year reset error:', error);
    });
}

// Past Data Functions
function openPastDataModal() {
    openModal('pastDataModal');
    loadAvailableYears();
}

function loadAvailableYears() {
    fetch('/api/historical-years')
    .then(response => response.json())
    .then(data => {
        const yearSelect = document.getElementById('historicalYear');
        yearSelect.innerHTML = '<option value="">Choose a year...</option>';
        
        data.years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            yearSelect.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading years:', error);
    });
}

function loadHistoricalData() {
    const selectedYear = document.getElementById('historicalYear').value;
    if (!selectedYear) {
        document.getElementById('historicalContent').style.display = 'none';
        return;
    }

    document.getElementById('selectedYear').textContent = selectedYear;
    document.getElementById('historicalContent').style.display = 'block';

    // Load historical P&L and transactions
    fetch(`/api/historical-data/${selectedYear}`)
    .then(response => response.json())
    .then(data => {
        displayHistoricalPL(data.pl);
        displayHistoricalTransactions(data.transactions);
    })
    .catch(error => {
        console.error('Error loading historical data:', error);
        showNotification('Error loading historical data', 'error');
    });
}

function displayHistoricalPL(plData) {
    const plContainer = document.getElementById('historicalPL');
    
    let totalRevenue = 0;
    let totalExpenses = 0;
    
    let revenueRows = '';
    Object.entries(plData.revenue || {}).forEach(([category, amount]) => {
        totalRevenue += amount;
        revenueRows += `
            <tr>
                <td>${category}</td>
                <td>${formatCurrency(amount)}</td>
            </tr>
        `;
    });
    
    let expenseRows = '';
    Object.entries(plData.expenses || {}).forEach(([category, amount]) => {
        totalExpenses += amount;
        expenseRows += `
            <tr>
                <td>${category}</td>
                <td>${formatCurrency(amount)}</td>
            </tr>
        `;
    });
    
    const netBalance = totalRevenue - totalExpenses;
    const netColor = netBalance >= 0 ? '#28a745' : '#dc3545';
    
    plContainer.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <h5>Revenue</h5>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${revenueRows}
                        <tr style="font-weight: bold; border-top: 2px solid #ddd;">
                            <td>Total Revenue</td>
                            <td>${formatCurrency(totalRevenue)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div>
                <h5>Expenses</h5>
                <table class="table">
                    <thead>
                        <tr>
                            <th>Category</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${expenseRows}
                        <tr style="font-weight: bold; border-top: 2px solid #ddd;">
                            <td>Total Expenses</td>
                            <td>${formatCurrency(totalExpenses)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
            <h4 style="color: ${netColor};">
                Net ${netBalance >= 0 ? 'Profit' : 'Loss'}: ${formatCurrency(Math.abs(netBalance))}
            </h4>
        </div>
    `;
}

function displayHistoricalTransactions(transactions) {
    const transContainer = document.getElementById('historicalTransactions');
    
    if (!transactions || transactions.length === 0) {
        transContainer.innerHTML = '<p style="text-align: center; color: #666;">No transactions found for this year.</p>';
        return;
    }
    
    const transactionRows = transactions.map(trans => `
        <tr>
            <td>${formatDate(trans.date)}</td>
            <td>${trans.type}</td>
            <td>${trans.category}</td>
            <td>${trans.description}</td>
            <td>${formatCurrency(trans.amount)}</td>
        </tr>
    `).join('');
    
    transContainer.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Description</th>
                    <th>Amount</th>
                </tr>
            </thead>
            <tbody>
                ${transactionRows}
            </tbody>
        </table>
    `;
}

// Notification function
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 25px;
        background-color: ${type === 'success' ? '#4CAF50' : '#f44336'};
        color: white;
        border-radius: 4px;
        z-index: 1000;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease-out;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        font-size: 14px;
        font-weight: bold;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Event delegation for delete and edit buttons
document.addEventListener('click', function(event) {
    // Handle delete buttons
    if (event.target.closest('.delete-btn') || (event.target.parentElement && event.target.parentElement.classList.contains('delete-btn'))) {
        const button = event.target.closest('.delete-btn') || event.target.parentElement.closest('.delete-btn');
        if (!button) return;
        
        const id = button.getAttribute('data-id');
        const month = button.getAttribute('data-month');
        const row = button.closest('tr');
        if (!row) return;
        
        const table = row.closest('table');
        if (!table) return;
        
        const tableId = table.id;
        
        // Determine which delete function to call based on the table
        if (tableId === 'incomeTable') {
            deleteIncome(id, event);
        } else if (tableId === 'tithesTable') {
            // For tithes table, we need both member ID and month
            deleteTithe(id, month, event);
        } else if (tableId === 'expensesTable' || tableId === 'otherExpensesTable') {
            deleteExpense(id, event);
        } else if (tableId === 'inventoryTable') {
            deleteInventory(id, event);
        } else if (tableId === 'districtExpensesTable') {
            deleteDistrictExpense(id, event);
        } else if (tableId === 'nationalExpensesTable') {
            deleteNationalExpense(id, event);
        }
    }
    
    // Handle edit buttons
    if (event.target.closest('.edit-btn') || (event.target.parentElement && event.target.parentElement.classList.contains('edit-btn'))) {
        const button = event.target.closest('.edit-btn') || event.target.parentElement.closest('.edit-btn');
        if (!button) return;
        
        const id = button.getAttribute('data-id');
        const row = button.closest('tr');
        if (!row) return;
        
        const table = row.closest('table');
        if (!table) return;
        
        const tableId = table.id;
        
        // Determine which edit function to call based on the table
        if (tableId === 'incomeTable') {
            editIncome(id);
        } else if (tableId === 'tithesTable') {
            editTithe(id);
        } else if (tableId === 'expensesTable') {
            editExpense(id);
        } else if (tableId === 'inventoryTable') {
            editInventory(id);
        } else if (tableId === 'districtExpensesTable') {
            editDistrictExpense(id);
        } else if (tableId === 'nationalExpensesTable') {
            editNationalExpense(id);
        }
    }
});
