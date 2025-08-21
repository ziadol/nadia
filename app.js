// Configuration et variables globales
const config = {
  colors: {
    primary: '#3498db',
    secondary: '#2ecc71',
    tertiary: '#f39c12',
    danger: '#e74c3c',
    dark: '#2c3e50',
    light: '#ecf0f1'
  },
  chartOptions: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top'
      },
      tooltip: {
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  }
};

let currentUser = null;
let autoRefreshInterval;
const users = [
  { username: 'admin', password: 'admin123' }
];

// Initialisation de la base de données
function initDatabase() {
  if (!localStorage.getItem('drivers')) {
    localStorage.setItem('drivers', JSON.stringify([]));
  }
  if (!localStorage.getItem('fuelLogs')) {
    localStorage.setItem('fuelLogs', JSON.stringify([]));
  }
}

// Getters pour les données
function getDrivers() {
  return JSON.parse(localStorage.getItem('drivers')) || [];
}

function getFuelLogs() {
  return JSON.parse(localStorage.getItem('fuelLogs')) || [];
}

// Setters pour les données
function saveDrivers(drivers) {
  localStorage.setItem('drivers', JSON.stringify(drivers));
}

function saveFuelLogs(logs) {
  localStorage.setItem('fuelLogs', JSON.stringify(logs));
}

// Fonctions d'authentification
function login() {
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();
  const user = users.find(u => u.username === username && u.password === password);
  const spinner = document.getElementById('loadingSpinner');
  const errorText = document.getElementById('loginError');

  errorText.textContent = '';
  spinner.style.display = 'block';

  setTimeout(() => {
    spinner.style.display = 'none';
    if (user) {
      currentUser = user.username;
      localStorage.setItem('currentUser', currentUser);
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('appContent').style.display = 'block';
      initApp();
      showNotification('Connexion réussie!', 'success');
    } else {
      errorText.textContent = "Identifiants incorrects";
    }
  }, 1000);
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  location.reload();
}

// Initialisation de l'application
function initApp() {
  initDatabase();
  setupEventListeners();
  loadDriversTable();
  loadFuelLogsTable();
  updateDriverFilter();
  updateDashboard();
  startAutoRefresh();
}

function setupEventListeners() {
  // Gestion des onglets
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const tabId = this.getAttribute('data-tab');
      openTab(tabId);
    });
  });

  // Formulaire carburant
  document.getElementById('fuelLogForm').addEventListener('submit', function(e) {
    e.preventDefault();
    saveFuelLog();
  });

  // Auto-remplir la date/heure actuelle
  updateDateTime();
}

function openTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.getElementById(tabId).classList.add('active');
  document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
}

// Gestion des chauffeurs
function ajouterOuModifierChauffeur() {
  const nom = document.getElementById('chauffeurNom').value.trim();
  const numeroPermis = document.getElementById('numeroPermis').value.trim();
  const categories = Array.from(document.getElementById('categoriePermis').selectedOptions)
                         .map(opt => opt.value);
  const numeroCartePro = document.getElementById('numeroCartePro').value.trim();
  const dateDebut = document.getElementById('dateDebutCartePro').value;
  const dateFin = document.getElementById('dateFinCartePro').value;
  const vehicule = document.getElementById('vehiculeAssocie').value.trim();

  if (!nom || !numeroPermis) {
    showNotification('Le nom et le numéro de permis sont obligatoires', 'danger');
    return;
  }

  const drivers = getDrivers();
  const driverIndex = document.getElementById('submitChauffeur').getAttribute('data-edit-index');

  const driverData = {
    nom,
    numeroPermis,
    categories,
    numeroCartePro,
    dateDebutCartePro: dateDebut,
    dateFinCartePro: dateFin,
    vehiculeAssocie: vehicule,
    createdAt: new Date().toISOString(),
    createdBy: currentUser
  };

  if (driverIndex !== null) {
    drivers[driverIndex] = driverData;
    document.getElementById('submitChauffeur').textContent = 'Ajouter Chauffeur';
    document.getElementById('submitChauffeur').removeAttribute('data-edit-index');
    showNotification('Chauffeur modifié avec succès', 'success');
  } else {
    drivers.push(driverData);
    showNotification('Chauffeur ajouté avec succès', 'success');
  }

  saveDrivers(drivers);
  loadDriversTable();
  updateDriverFilter();
  updateDashboard();
  resetChauffeurForm();
}

function loadDriversTable() {
  const drivers = getDrivers();
  const tbody = document.querySelector('#chauffeurTable tbody');
  tbody.innerHTML = '';

  drivers.forEach((driver, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${driver.nom}</td>
      <td>${driver.numeroPermis}</td>
      <td>${driver.categories.join(', ')}</td>
      <td>${driver.numeroCartePro || '-'}</td>
      <td>${driver.dateDebutCartePro || '-'}</td>
      <td>${driver.dateFinCartePro || '-'}</td>
      <td>${driver.vehiculeAssocie || '-'}</td>
      <td>
        <button onclick="editDriver(${index})" class="edit-btn"><i class="fas fa-edit"></i></button>
        <button onclick="deleteDriver(${index})" class="delete-btn"><i class="fas fa-trash"></i></button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function editDriver(index) {
  const drivers = getDrivers();
  const driver = drivers[index];

  document.getElementById('chauffeurNom').value = driver.nom;
  document.getElementById('numeroPermis').value = driver.numeroPermis;
  
  const categorySelect = document.getElementById('categoriePermis');
  Array.from(categorySelect.options).forEach(option => {
    option.selected = driver.categories.includes(option.value);
  });

  document.getElementById('numeroCartePro').value = driver.numeroCartePro || '';
  document.getElementById('dateDebutCartePro').value = driver.dateDebutCartePro || '';
  document.getElementById('dateFinCartePro').value = driver.dateFinCartePro || '';
  document.getElementById('vehiculeAssocie').value = driver.vehiculeAssocie || '';

  const submitBtn = document.getElementById('submitChauffeur');
  submitBtn.textContent = 'Enregistrer';
  submitBtn.setAttribute('data-edit-index', index);
  submitBtn.innerHTML = '<i class="fas fa-save"></i> Enregistrer';
}

function deleteDriver(index) {
  if (confirm('Voulez-vous vraiment supprimer ce chauffeur ?')) {
    const drivers = getDrivers();
    drivers.splice(index, 1);
    saveDrivers(drivers);
    loadDriversTable();
    updateDriverFilter();
    updateDashboard();
    showNotification('Chauffeur supprimé', 'success');
  }
}

function resetChauffeurForm() {
  document.getElementById('chauffeurNom').value = '';
  document.getElementById('numeroPermis').value = '';
  document.getElementById('categoriePermis').selectedIndex = -1;
  document.getElementById('numeroCartePro').value = '';
  document.getElementById('dateDebutCartePro').value = '';
  document.getElementById('dateFinCartePro').value = '';
  document.getElementById('vehiculeAssocie').value = '';
}

// Gestion du carburant
function saveFuelLog() {
  const dateTime = document.getElementById('fuelDateTime').value;
  const matricule = document.getElementById('matricule').value.trim();
  const kilometers = parseFloat(document.getElementById('kilometers').value);
  const fuelQty = parseFloat(document.getElementById('fuelQty').value);
  const pricePerLiter = parseFloat(document.getElementById('pricePerLiter').value);
  const trajet = document.getElementById('trajet').value.trim();
  const containerNum = document.getElementById('containerNum').value.trim();
  const fuelNotes = document.getElementById('fuelNotes').value.trim();
  const tireChangeDate = document.getElementById('tireChangeDate').value;

  if (!dateTime || !matricule || isNaN(kilometers) || isNaN(fuelQty) || isNaN(pricePerLiter) || !trajet) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'danger');
    return;
  }

  const fuelLogs = getFuelLogs();
  const editIndex = document.getElementById('fuelLogForm').getAttribute('data-edit-index');

  const logData = {
    dateTime,
    matricule,
    kilometers,
    fuelQty,
    pricePerLiter,
    total: (fuelQty * pricePerLiter).toFixed(2),
    trajet,
    containerNum,
    fuelNotes,
    tireChangeDate,
    driver: document.getElementById('fuelDriverFilter').value || 'Non spécifié',
    addedBy: currentUser,
    addedAt: new Date().toISOString()
  };

  if (editIndex !== null) {
    fuelLogs[editIndex] = logData;
    document.getElementById('fuelLogForm').removeAttribute('data-edit-index');
    showNotification('Entrée modifiée avec succès', 'success');
  } else {
    fuelLogs.push(logData);
    showNotification('Entrée ajoutée avec succès', 'success');
  }

  saveFuelLogs(fuelLogs);
  loadFuelLogsTable();
  updateDashboard();
  document.getElementById('fuelLogForm').reset();
  updateDateTime();
}

function loadFuelLogsTable() {
  const fuelLogs = getFuelLogs();
  const tbody = document.querySelector('#fuelLogTable tbody');
  tbody.innerHTML = '';

  const driverFilter = document.getElementById('fuelDriverFilter').value;

  fuelLogs
    .filter(log => !driverFilter || log.driver === driverFilter)
    .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime))
    .forEach((log, index) => {
      const date = new Date(log.dateTime);
      const dateStr = date.toLocaleDateString();
      const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      const tireChange = log.tireChangeDate ? 
        `<i class="fas fa-check" style="color: ${config.colors.secondary};"></i> ${new Date(log.tireChangeDate).toLocaleDateString()}` : 
        `<i class="fas fa-times" style="color: ${config.colors.danger};"></i>`;

      const row = document.createElement('tr');
      if (index === 0 && !driverFilter) {
        row.classList.add('new-entry');
      }
      
      row.innerHTML = `
        <td>${dateStr} ${timeStr}</td>
        <td>${log.matricule}</td>
        <td>${log.kilometers}</td>
        <td>${log.fuelQty}</td>
        <td>${log.pricePerLiter} (${log.total}€)</td>
        <td>${log.trajet}</td>
        <td>${tireChange}</td>
        <td>
          <button onclick="editFuelLog(${index})" class="edit-btn"><i class="fas fa-edit"></i></button>
          <button onclick="deleteFuelLog(${index})" class="delete-btn"><i class="fas fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(row);
    });
}

function editFuelLog(index) {
  const fuelLogs = getFuelLogs();
  const log = fuelLogs[index];

  const date = new Date(log.dateTime);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  const localISOTime = new Date(date - timezoneOffset).toISOString().slice(0, 16);

  document.getElementById('fuelDateTime').value = localISOTime;
  document.getElementById('matricule').value = log.matricule;
  document.getElementById('kilometers').value = log.kilometers;
  document.getElementById('fuelQty').value = log.fuelQty;
  document.getElementById('pricePerLiter').value = log.pricePerLiter;
  document.getElementById('trajet').value = log.trajet;
  document.getElementById('containerNum').value = log.containerNum || '';
  document.getElementById('fuelNotes').value = log.fuelNotes || '';
  document.getElementById('tireChangeDate').value = log.tireChangeDate || '';

  // Définir l'index en cours d'édition
  document.getElementById('fuelLogForm').setAttribute('data-edit-index', index);
}

function deleteFuelLog(index) {
  if (confirm('Voulez-vous vraiment supprimer cette entrée ?')) {
    const fuelLogs = getFuelLogs();
    fuelLogs.splice(index, 1);
    saveFuelLogs(fuelLogs);
    loadFuelLogsTable();
    updateDashboard();
    showNotification('Entrée supprimée', 'success');
  }
}

function filterFuelLogs() {
  loadFuelLogsTable();
}

function updateDriverFilter() {
  const select = document.getElementById('fuelDriverFilter');
  select.innerHTML = '<option value="">-- Tous les chauffeurs --</option>';

  const drivers = getDrivers();
  drivers.forEach(driver => {
    const option = document.createElement('option');
    option.value = driver.nom;
    option.textContent = driver.nom;
    select.appendChild(option);
  });
}

// Tableau de bord et statistiques
function updateDashboard() {
  const drivers = getDrivers();
  const fuelLogs = getFuelLogs();

  document.getElementById('driverCount').textContent = drivers.length;
  document.getElementById('fuelCount').textContent = fuelLogs.length;

  // Dernier ravitaillement
  if (fuelLogs.length > 0) {
    const lastLog = fuelLogs[fuelLogs.length - 1];
    const date = new Date(lastLog.dateTime);
    document.getElementById('lastRefuel').textContent = 
      `${date.toLocaleDateString()} - ${lastLog.driver} (${lastLog.fuelQty}L)`;
  } else {
    document.getElementById('lastRefuel').textContent = 'Aucun';
  }

  // Nouvelles statistiques
  if (fuelLogs.length > 0) {
    const totalKm = fuelLogs.reduce((sum, log) => sum + log.kilometers, 0);
    const totalFuel = fuelLogs.reduce((sum, log) => sum + log.fuelQty, 0);
    const totalCost = fuelLogs.reduce((sum, log) => sum + parseFloat(log.total), 0);
    
    const avgConsumption = totalKm > 0 ? (totalFuel / totalKm * 100).toFixed(2) : 0;
    const avgKm = (totalKm / fuelLogs.length).toFixed(0);
    const avgCost = (totalCost / fuelLogs.length).toFixed(2);
    
    document.getElementById('avgConsumption').textContent = `${avgConsumption} L/100km`;
    document.getElementById('avgKilometers').textContent = `${avgKm} km`;
    document.getElementById('avgCost').textContent = `${avgCost} €`;
  }

  updateFuelChart();
  updateConsumptionChart();
}

function updateFuelChart() {
  const fuelLogs = getFuelLogs();
  const ctx = document.getElementById('fuelChart').getContext('2d');

  // Grouper par mois
  const monthlyData = {};
  fuelLogs.forEach(log => {
    const date = new Date(log.dateTime);
    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
    
    if (!monthlyData[monthYear]) {
      monthlyData[monthYear] = {
        totalFuel: 0,
        totalCost: 0,
        count: 0
      };
    }
    
    monthlyData[monthYear].totalFuel += parseFloat(log.fuelQty);
    monthlyData[monthYear].totalCost += parseFloat(log.total);
    monthlyData[monthYear].count++;
  });

  const labels = Object.keys(monthlyData);
  const fuelData = labels.map(month => monthlyData[month].totalFuel);
  const costData = labels.map(month => monthlyData[month].totalCost);

  if (window.fuelChart) {
    window.fuelChart.data.labels = labels;
    window.fuelChart.data.datasets[0].data = fuelData;
    window.fuelChart.data.datasets[1].data = costData;
    window.fuelChart.update();
  } else {
    window.fuelChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Litres de carburant',
            data: fuelData,
            backgroundColor: config.colors.primary,
            borderColor: config.colors.primary,
            borderWidth: 1
          },
          {
            label: 'Coût total (€)',
            data: costData,
            backgroundColor: config.colors.secondary,
            borderColor: config.colors.secondary,
            borderWidth: 1,
            type: 'line',
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        ...config.chartOptions,
        plugins: {
          ...config.chartOptions.plugins,
          title: {
            display: true,
            text: 'Consommation et coût mensuels',
            font: { size: 16 }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Litres' },
            grid: { color: 'rgba(0,0,0,0.05)' }
          },
          y1: {
            position: 'right',
            beginAtZero: true,
            title: { display: true, text: 'Euros (€)' },
            grid: { drawOnChartArea: false }
          },
          x: {
            grid: { color: 'rgba(0,0,0,0.05)' }
          }
        }
      }
    });
  }
}

function updateConsumptionChart() {
  const fuelLogs = getFuelLogs();
  const ctx = document.getElementById('consumptionChart').getContext('2d');
  
  // Préparer les données (10 dernières entrées)
  const recentLogs = [...fuelLogs]
    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
    .slice(-10);
  
  const labels = recentLogs.map(log => 
    new Date(log.dateTime).toLocaleDateString());
  const consumptionData = recentLogs.map(log => 
    (log.fuelQty / log.kilometers * 100).toFixed(2));

  if (window.consumptionChart) {
    window.consumptionChart.data.labels = labels;
    window.consumptionChart.data.datasets[0].data = consumptionData;
    window.consumptionChart.update();
  } else {
    window.consumptionChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Consommation (L/100km)',
          data: consumptionData,
          backgroundColor: config.colors.tertiary,
          borderColor: config.colors.tertiary,
          borderWidth: 2,
          fill: false,
          tension: 0.1
        }]
      },
      options: {
        ...config.chartOptions,
        plugins: {
          ...config.chartOptions.plugins,
          title: {
            display: true,
            text: 'Consommation par ravitaillement',
            font: { size: 16 }
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            title: { display: true, text: 'L/100km' }
          }
        }
      }
    });
  }
}

// Fonctions utilitaires
function updateDateTime() {
  const now = new Date();
  const dateTimeString = now.toISOString().slice(0, 16);
  document.getElementById('fuelDateTime').value = dateTimeString;
}

function startAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
  
  // Actualiser l'heure toutes les minutes
  autoRefreshInterval = setInterval(updateDateTime, 60000);
}

function showNotification(message, type) {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i> ${message}`;
  
  // Supprimer les anciennes notifications
  document.querySelectorAll('.notification').forEach(el => el.remove());
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Export CSV
function exportCSV() {
  const fuelLogs = getFuelLogs();
  
  if (fuelLogs.length === 0) {
    showNotification('Aucune donnée à exporter', 'danger');
    return;
  }

  // Entête CSV
  let csv = 'Date,Heure,Chauffeur,Matricule,Kilométrage,Quantité (L),Prix/Litre,Total (€),Trajet,Num TC,Notes,Date changement pneus\n';

  // Données
  fuelLogs.forEach(log => {
    const date = new Date(log.dateTime);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    csv += `"${dateStr}","${timeStr}","${log.driver}","${log.matricule}",${log.kilometers},${log.fuelQty},${log.pricePerLiter},${log.total},"${log.trajet}","${log.containerNum || ''}","${log.fuelNotes || ''}","${log.tireChangeDate || ''}"\n`;
  });

  // Téléchargement
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `export_carburant_${new Date().toISOString().slice(0,10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showNotification('Export CSV généré', 'success');
}

// Vérification de la connexion au chargement
document.addEventListener('DOMContentLoaded', function() {
  initDatabase();
  
  if (localStorage.getItem('currentUser')) {
    currentUser = localStorage.getItem('currentUser');
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appContent').style.display = 'block';
    initApp();
  }
});