// script.js
import {
    listenToAuthChanges,
    handleSignOut as authHandleSignOut,
    showAppUI,
    getDb,
    getCurrentUser
} from './auth.js';

import {
    initializeMembersModule,
    loadMembers as loadMembersFromModule,
    setupAddMemberModal as setupNewMemberModal
} from './member.js';

import {
    initializeAnimationsModule,
    loadAnimations as loadAnimationsFromModule,
    setupAddAnimationModal
} from './animations.js';

import {
    initializeTasksModule,
    getAllTasks as getAllTasksFromModule,
    loadTasksForPage,
    setupAddTaskModal,
} from './task.js';
import { generateAnnualReportPDF } from './reportGenerator.js';

// --- App State ---
let dbInstance = null;
let appUser = null;
let allMembersData = [];
let allRawAnimationsDataGlobal = []; // Stocke TOUTES les animations non filtrées par année
let allRawTasksDataGlobal = [];    // Stocke TOUTES les tâches non filtrées par année
let currentDashboardAnimations = []; // Animations (non-réunions) filtrées pour l'année du dashboard
let currentDashboardTasks = [];    // Tâches filtrées pour l'année du dashboard
let currentDashboardReunionsCount = 0; // Compteur pour les réunions de l'année
let selectedDashboardYear = new Date().getFullYear(); // Année en cours par défaut
let currentOpenModalId = null;

// --- DOM References ---
const appShell = document.getElementById('appShell');

// --- 1. APP INITIALIZATION ---
function initializeApp(user) {
    console.log("initializeApp: User authenticated, setting up application.", user.email);
    appUser = user;
    dbInstance = getDb();
    selectedDashboardYear = new Date().getFullYear(); // Réinitialiser à l'année en cours à chaque connexion

    initializeFeatureModules();
    showAppUI(); // Géré par auth.js, affiche appShell et cache authContainer
    renderAppShellDOM(user); // Construit le contenu de appShell
    attachCoreAppEventListeners(); // Attache les listeners principaux de l'app
    initializeCoreUIFeatures(); // Enregistre plugins graphiques et initialise les instances
    loadInitialDataAndUpdateDashboard(); // Charge les données et met à jour le dashboard

    if (typeof feather !== 'undefined') feather.replace();
    console.log("initializeApp: Application setup complete.");
}

function initializeFeatureModules() {
    console.log("initializeFeatureModules: Initializing data modules.");
    if (dbInstance) {
        initializeMembersModule(dbInstance);
        initializeAnimationsModule(dbInstance);
        initializeTasksModule(dbInstance);
    } else {
        console.error("initializeFeatureModules: dbInstance is not available!");
    }
}

function onUserSignedOut() {
    console.log("onUserSignedOut: Cleaning up application state.");
    if (appShell) appShell.innerHTML = ''; // Vider la coquille
    appUser = null; dbInstance = null;
    allMembersData = [];
    allRawAnimationsDataGlobal = []; allRawTasksDataGlobal = [];
    currentDashboardAnimations = []; currentDashboardTasks = [];
    currentDashboardReunionsCount = 0;
    selectedDashboardYear = new Date().getFullYear();
    if (animationsBarChartInstance) { animationsBarChartInstance.destroy(); animationsBarChartInstance = null; }
    if (tasksDoughnutChartInstance) { tasksDoughnutChartInstance.destroy(); tasksDoughnutChartInstance = null; }
    // auth.js gère l'affichage de l'écran de connexion
}

// --- 2. RENDER APP SHELL CONTENT ---
function renderAppShellDOM(user) {
    console.log("renderAppShellDOM: Building and injecting app's HTML structure.");
    const appHTML = `
        <header>
            <div class="container">
                <div class="header-content">
                    <div class="logo"><div class="logo-icon"><i data-feather="activity"></i></div><span>QVCT CRM59 Dashboard</span></div>
                    <nav>
                        <ul>
                            <li><a href="#dashboard" class="nav-link active" data-page="dashboard"><i data-feather="grid"></i> <span>Dashboard</span></a></li>
                            <li><a href="#animations" class="nav-link" data-page="animations"><i data-feather="calendar"></i> <span>Animations</span></a></li>
                            <li><a href="#members" class="nav-link" data-page="members"><i data-feather="users"></i> <span>Membres</span></a></li>
                            <li><a href="#tasks" class="nav-link" data-page="tasks"><i data-feather="check-square"></i> <span>Tâches</span></a></li>
                            <li><a href="#settings" class="nav-link" data-page="settings"><i data-feather="settings"></i> <span>Paramètres</span></a></li>
                        </ul>
                    </nav>
                    <div class="user-menu">
                        <button class="theme-toggle" id="themeToggleApp"><i data-feather="sun"></i></button>
                        <div class="user-profile">
                            <img id="userAvatarApp" src="${user.photoURL || './default-avatar.png'}" alt="Avatar" class="avatar">
                            <span id="userNameApp">${user.displayName || user.email}</span>
                        </div>
                        <button class="btn btn-sm btn-outline" id="logoutBtnApp"><i data-feather="log-out"></i> Déconnexion</button>
                    </div>
                </div>
            </div>
        </header>
        <main>
            <div class="container" id="mainAppContainer">
                <div class="page active" id="dashboard">
                    <div class="page-title">
                        <h1>Tableau de bord</h1>
                        <div id="dashboardYearSelectorContainer" class="year-selector-buttons" style="display: flex; gap: 8px;">
                            
                        </div>
                        <button class="btn btn-sm btn-outline" id="generateReportBtn" title="Générer le Bilan Annuel PDF">
                            <i data-feather="file-text"></i> Bilan PDF
                        </button>

                    </div>
                    <p>Bienvenue, <span id="welcomeUserName">${user.displayName || user.email}</span>!</p>
                    <div class="stats-grid">
                        <div class="stat-card"><div class="stat-icon blue"><i data-feather="calendar"></i></div><div class="stat-value" id="statsAnimationsCount">0</div><div class="stat-label">Animations (Année)</div></div>
                        <div class="stat-card"><div class="stat-icon green"><i data-feather="users"></i></div><div class="stat-value" id="statsActiveMembers">0</div><div class="stat-label">Membres</div></div>
                        <div class="stat-card"><div class="stat-icon purple"><i data-feather="list"></i></div><div class="stat-value" id="statsTotalTasks">0</div><div class="stat-label">Tâches (Année)</div></div>
                        <div class="stat-card">
                            <div class="stat-icon yellow"><i data-feather="alert-circle"></i></div>
                            <div class="stat-value" id="statsTodoTasks">0</div>
                            <div class="stat-label">À Réaliser (Année)</div>
                            <div class="stat-detail" id="nextTodoTaskName" style="margin-top: 8px; font-size: 0.8em; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width:100%;">Prochaine : ...</div>
                        </div>
                        
                    </div>
                    <div class="chart-container">
                        <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Animations & Budget / Mois</h3></div><div class="chart-body"><canvas id="animationsChart"></canvas></div></div>
                        <div class="chart-card"><div class="chart-header"><h3 class="chart-title">Statuts Tâches (Année)</h3></div><div class="chart-body"><canvas id="tasksStatusChart"></canvas></div></div>
                    </div>
                    <div class="dashboard-summary-row" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; margin-top: 32px;">
                        <div class="budget-summary-card" id="annualBudgetCard">
                            <div class="budget-summary-header"><h3 class="budget-summary-title">Budget Annuel <span id="annualBudgetCurrentYear">(----)</span></h3></div>
                            <div class="budget-summary-content">
                                <div class="budget-item"><span class="budget-label">Budget Alloué:</span><span class="budget-value" id="annualBudgetAllocated">0.00€</span></div>
                                <div class="budget-item"><span class="budget-label">Total Dépensé (Année):</span><span class="budget-value spent" id="annualBudgetSpent">0.00€</span></div>
                                <div class="budget-item"><span class="budget-label">Restant:</span><span class="budget-value remaining" id="annualBudgetRemaining">0.00€</span></div>
                                <div class="budget-progress-bar-container"><div class="budget-progress-bar" id="annualBudgetProgressBar" style="width: 0%;"></div></div>
                            </div>
                        </div>
                        <div class="stat-card" id="reunionsStatCard">
                            <div class="stat-icon teal"><i data-feather="message-square"></i></div>
                            <div class="stat-value" id="statsReunionsCount">0</div>
                            <div class="stat-label">Réunions (Année)</div>
                        </div>
                         <div class="stat-card">
                            <div class="stat-icon orange"><i data-feather="dollar-sign"></i></div>
                            <div class="stat-value" id="statsTotalBudgetTasks">0€</div>
                            <div class="stat-label">Budget Tâches (Année)</div>
                        </div>
                    </div>
                </div>
                <div class="page" id="animations"><div class="page-title"><h1>Animations</h1><button class="btn" id="addAnimationBtn"><i data-feather="plus"></i> Nouvelle animation</button></div><div class="animations-grid" id="animationsGridContainer"></div></div>
                <div class="page" id="members"><div class="page-title"><h1>Membres</h1><button class="btn" id="addMemberBtn"><i data-feather="user-plus"></i> Nouveau membre</button></div><div class="members-grid" id="membersGridContainer"></div></div>
                <div class="page" id="tasks">
                    <div class="page-title"><h1>Gestion des Tâches</h1><button class="btn" id="addTaskBtnPage"><i data-feather="plus"></i> Nouvelle Tâche</button></div>
                    <div class="tasks-filters" style="margin-bottom:20px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;">
                        <label class="form-label" style="margin-bottom:0;">Animation:</label><select id="taskFilterAnimation" class="form-control form-select" style="width:auto;flex-basis:200px;"><option value="">Toutes</option></select>
                        <label class="form-label" style="margin-bottom:0;">Statut:</label><select id="taskFilterStatus" class="form-control form-select" style="width:auto;flex-basis:150px;"><option value="">Tous</option><option value="todo">À faire</option><option value="pending">En cours</option><option value="completed">Terminé</option></select>
                        <label class="form-label" style="margin-bottom:0;">Assigné à:</label><select id="taskFilterAssignee" class="form-control form-select" style="width:auto;flex-basis:200px;"><option value="">Tous</option></select>
                        <button id="applyTaskFiltersBtn" class="btn btn-sm">Filtrer</button>
                    </div>
                    <div class="tasks-list" id="allTasksListContainer"></div>
                </div>
                <div class="page" id="settings"><div class="page-title"><h1>Paramètres</h1></div><div class="settings-section"><div class="settings-header"><h2 class="settings-title">Apparence</h2></div><div class="settings-option"><div class="settings-option-info"><div class="settings-option-title">Thème sombre</div></div><label class="toggle-switch"><input type="checkbox" id="darkModeToggleApp"><span class="toggle-slider"></span></label></div></div></div>
            </div>
        </main>
        <footer>
            <div class="container">
                <p>© 2025 - QVCT Dashboard CRM59 (v3). Tous droits réservés.</p>
            </div>
        </footer>
    `;
    if (appShell) appShell.innerHTML = appHTML;
    navigateToPage('dashboard');
}

// --- YEAR SELECTOR LOGIC ---
function setupDashboardYearSelector() {
    if (!appShell) return;
    const yearSelectorContainer = appShell.querySelector('#dashboardYearSelectorContainer');
    if (!yearSelectorContainer) { console.warn("Dashboard year selector container not found."); return; }

    const years = new Set();
    allRawAnimationsDataGlobal.forEach(anim => {
        if (anim.dateTime && typeof anim.dateTime.toDate === 'function') years.add(anim.dateTime.toDate().getFullYear());
    });
    allRawTasksDataGlobal.forEach(task => {
        if (task.createdAt && typeof task.createdAt.toDate === 'function') years.add(task.createdAt.toDate().getFullYear());
        else if (task.createdAt && (typeof task.createdAt === 'number' || typeof task.createdAt === 'string')) { try { const d = new Date(task.createdAt); if (!isNaN(d.getTime())) years.add(d.getFullYear()); } catch(e){} }
        if (task.dueDate && typeof task.dueDate.toDate === 'function') years.add(task.dueDate.toDate().getFullYear());
        else if (task.dueDate && (typeof task.dueDate === 'number' || typeof task.dueDate === 'string')) { try { const d = new Date(task.dueDate); if (!isNaN(d.getTime())) years.add(d.getFullYear()); } catch(e){} }
    });

    let sortedYears = Array.from(years).sort((a, b) => b - a);
    const currentSystemYear = new Date().getFullYear();
    if (sortedYears.length === 0 || !sortedYears.includes(currentSystemYear)) {
        if (!sortedYears.includes(currentSystemYear)) sortedYears.push(currentSystemYear);
        sortedYears.sort((a, b) => b - a);
    }

    yearSelectorContainer.innerHTML = '';
    sortedYears.forEach(year => {
        const button = document.createElement('button');
        button.classList.add('btn', 'btn-sm');
        button.textContent = year;
        button.dataset.year = year;
        if (year === selectedDashboardYear) {
            button.classList.add('btn-primary'); button.classList.remove('btn-outline');
        } else {
            button.classList.add('btn-outline');
        }
        button.addEventListener('click', async () => {
            if (selectedDashboardYear !== year) {
                selectedDashboardYear = year;
                yearSelectorContainer.querySelectorAll('button').forEach(btn => {
                    btn.classList.remove('btn-primary'); btn.classList.add('btn-outline');
                });
                button.classList.add('btn-primary'); button.classList.remove('btn-outline');
                await filterAndDisplayDashboardData();
            }
        });
        yearSelectorContainer.appendChild(button);
    });
    console.log("Dashboard year selector buttons created/updated. Selected year:", selectedDashboardYear);
}

// --- 3. ATTACH CORE EVENT LISTENERS ---
function attachCoreAppEventListeners() {
    if (!appShell) { console.error("attachCoreAppEventListeners: appShell is null."); return; }
    appShell.querySelector('#logoutBtnApp')?.addEventListener('click', authHandleSignOut);
    appShell.querySelector('#addAnimationBtn')?.addEventListener('click', async () => {
        if (openModal('addAnimationModal', 'animationModalTemplate')) await setupAddAnimationModal();
    });
    appShell.querySelector('#addMemberBtn')?.addEventListener('click', () => {
        if (openModal('addMemberModal', 'memberModalTemplate')) setupNewMemberModal();
    });
    appShell.querySelector('#addTaskBtnPage')?.addEventListener('click', async () => {
        if (openModal('addTaskModal', 'taskModalTemplate')) await setupAddTaskModal();
    });
    appShell.querySelector('#applyTaskFiltersBtn')?.addEventListener('click', applyAndLoadTasksForPage);
    setupAppNavigation();
    setupThemeToggle();
    const generateReportBtn = appShell.querySelector('#generateReportBtn');
    if (generateReportBtn) {
        // S'assurer qu'il n'y a pas de listeners dupliqués
        const newGenerateReportBtn = generateReportBtn.cloneNode(true);
        generateReportBtn.parentNode.replaceChild(newGenerateReportBtn, generateReportBtn);

        newGenerateReportBtn.addEventListener('click', async () => {
            const yearToReport = selectedDashboardYear; // Utiliser l'année sélectionnée du dashboard

            // 1. Récupérer les animations (non-réunions) de l'année DÉJÀ FILTRÉES
            // currentDashboardAnimations est déjà filtré par filterAndDisplayDashboardData()

            // 2. Récupérer les réunions de cette année à partir des données brutes globales
            const reunionsForReport = allRawAnimationsDataGlobal.filter(anim => {
                return anim.animationType === "Réunion" &&
                       anim.dateTime && typeof anim.dateTime.toDate === 'function' &&
                       anim.dateTime.toDate().getFullYear() === yearToReport;
            });

            // 3. Les tâches (currentDashboardTasks) sont DÉJÀ FILTRÉES pour l'année
            // par filterAndDisplayDashboardData()

            // 4. Vérifier s'il y a des données à exporter
            if (currentDashboardAnimations.length === 0 && reunionsForReport.length === 0 && currentDashboardTasks.length === 0) {
                alert(`Aucune donnée à exporter pour l'année ${yearToReport}.`);
                // Si showPdfSpinner est global ou importé, vous pouvez le cacher ici aussi,
                // mais il est principalement géré dans reportGenerator.js
                // hidePdfSpinner(); // Si vous aviez un spinner global géré ici
                return;
            }

            console.log("Requesting PDF generation for year:", yearToReport, {
                animationsNonReunionCount: currentDashboardAnimations.length,
                reunionsCount: reunionsForReport.length,
                tasksCount: currentDashboardTasks.length
            });

            // Le spinner sera affiché par generateAnnualReportPDF
            await generateAnnualReportPDF(
                yearToReport,
                currentDashboardAnimations, // Animations de l'année (hors réunions), déjà filtrées
                reunionsForReport,          // Réunions de l'année, filtrées ici
                currentDashboardTasks,      // Tâches de l'année, déjà filtrées
                allMembersData              // Tous les membres
            );
        });
    }
}

function applyInitialTheme() {
    const body = document.body;
    let themeFromStorage = localStorage.getItem('theme');
    if (!themeFromStorage) {
        themeFromStorage = 'light';
        console.log("applyInitialTheme: No theme in localStorage, visually defaulting to LIGHT.");
    } else {
        console.log("applyInitialTheme: Theme from localStorage:", themeFromStorage);
    }
    body.classList.toggle('light-theme', themeFromStorage === 'light');
}

function setupThemeToggle() {
    if (!appShell) return;
    const body = document.body;
    let currentTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
    if (localStorage.getItem('theme') !== currentTheme) {
        localStorage.setItem('theme', currentTheme);
    }
    updateThemeUIElements_App();
    function handleThemeChange() {
        body.classList.toggle('light-theme');
        currentTheme = body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        updateThemeUIElements_App();
        initializeCoreUIFeatures();
        console.log("Theme changed to (from app UI):", currentTheme, "- Charts re-initialized.");
    }
    function updateThemeUIElements_App() {
        const isLightTheme = body.classList.contains('light-theme');
        const appThemeToggle = appShell.querySelector('#themeToggleApp');
        const appDarkModeToggle = appShell.querySelector('#darkModeToggleApp');
        if (appThemeToggle) appThemeToggle.innerHTML = isLightTheme ? '<i data-feather="moon"></i>' : '<i data-feather="sun"></i>';
        if (appDarkModeToggle) appDarkModeToggle.checked = !isLightTheme;
        if (typeof feather !== 'undefined') feather.replace();
    }
    const themeToggleAppBtn = appShell.querySelector('#themeToggleApp');
    const darkModeSettingToggle = appShell.querySelector('#darkModeToggleApp');
    if (themeToggleAppBtn) { const newBtn = themeToggleAppBtn.cloneNode(true); themeToggleAppBtn.parentNode.replaceChild(newBtn, themeToggleAppBtn); newBtn.addEventListener('click', handleThemeChange); }
    if (darkModeSettingToggle) { const newToggle = darkModeSettingToggle.cloneNode(true); darkModeSettingToggle.parentNode.replaceChild(newToggle, darkModeSettingToggle); newToggle.addEventListener('change', handleThemeChange); }
    console.log("setupThemeToggle: App-specific theme listeners attached. Current theme:", currentTheme);
}

function setupAppNavigation() {
    if (!appShell) return;
    appShell.querySelectorAll('header nav .nav-link').forEach(link => {
        const newLink = link.cloneNode(true);
        link.parentNode.replaceChild(newLink, link);
        newLink.addEventListener('click', (e) => {
            e.preventDefault();
            const pageId = newLink.getAttribute('data-page');
            if (pageId) navigateToPage(pageId);
        });
    });
}

// --- 4. INITIALIZE CORE UI FEATURES (Charts, etc.) ---
let animationsBarChartInstance = null;
let tasksDoughnutChartInstance = null;

function initializeCoreUIFeatures() {
    console.log("initializeCoreUIFeatures: Setting up charts.");
    if (typeof Chart !== 'undefined' && typeof ChartAnnotation !== 'undefined') {
        Chart.register(ChartAnnotation);
        console.log("ChartAnnotation plugin registered for Core UI Features.");
    } else {
        console.warn("Chart.js or ChartAnnotation plugin not loaded for Core UI. Annotation line may not work.");
    }
    initializeCharts();
}

function initializeCharts() {
    if (!appShell) { console.warn("initializeCharts: appShell not found."); return; }
    console.log("initializeCharts: Destroying existing chart instances.");
    if (animationsBarChartInstance) { animationsBarChartInstance.destroy(); animationsBarChartInstance = null; }
    if (tasksDoughnutChartInstance) { tasksDoughnutChartInstance.destroy(); tasksDoughnutChartInstance = null; }

    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim();
    const gridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid-color-dark').trim() || 'rgba(128,128,128,0.1)';
    const sageColor = getComputedStyle(document.documentElement).getPropertyValue('--sage').trim();
    const infoColor = getComputedStyle(document.documentElement).getPropertyValue('--info').trim();
    const warningColor = getComputedStyle(document.documentElement).getPropertyValue('--warning').trim();
    const successColor = getComputedStyle(document.documentElement).getPropertyValue('--success').trim();
    const dangerColor = getComputedStyle(document.documentElement).getPropertyValue('--danger').trim();
    const budgetMensuelCible = 200;

    console.log("initializeCharts: Fetched current theme colors. TextColor:", textColor, "GridColor:", gridColor);

    const animationsCtx = appShell.querySelector('#animationsChart')?.getContext('2d');
    if (animationsCtx) {
        console.log("initializeCharts: Recreating animationsBarChartInstance.");
        animationsBarChartInstance = new Chart(animationsCtx, {
            type: 'bar',
            data: { labels: [], datasets: [
                    { label: 'Nombre d\'Animations', data: [], backgroundColor: sageColor, borderColor: infoColor, borderWidth: 1, yAxisID: 'yCount', order: 2 },
                    { label: 'Budget Dépensé (€)', data: [], type: 'line', borderColor: warningColor, backgroundColor: warningColor, tension: 0.1, yAxisID: 'yBudget', order: 1 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: {
                    yCount: { type: 'linear', display: true, position: 'left', beginAtZero: true, title: { display: true, text: 'Nombre d\'Animations', color: textColor }, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } },
                    yBudget: { type: 'linear', display: true, position: 'right', beginAtZero: true, title: { display: true, text: 'Budget Dépensé (€)', color: textColor }, ticks: { color: textColor, callback: value => `${value.toFixed(0)}€` }, grid: { drawOnChartArea: false } },
                    x: { ticks: { color: textColor }, grid: { color: gridColor } }
                },
                plugins: {
                    legend: { labels: { color: textColor } },
                    tooltip: { mode: 'index', intersect: false, callbacks: {
                            label: function(context) { let label = context.dataset.label || ''; if (label) label += ': '; if (context.parsed.y !== null) { if (context.dataset.yAxisID === 'yBudget') label += `${context.parsed.y.toFixed(2)}€`; else label += context.parsed.y; } return label; }
                        }
                    },
                    annotation: { annotations: {
                            line1: { type: 'line', yMin: budgetMensuelCible, yMax: budgetMensuelCible, borderColor: dangerColor, borderWidth: 2, borderDash: [6, 6], label: { content: `Budget Cible (${budgetMensuelCible}€)`, display: true, position: 'end', backgroundColor: 'rgba(0,0,0,0.6)', color: 'white', font: { size: 10 } }, yScaleID: 'yBudget' }
                        }
                    }
                }
            }
        });
    } else { console.warn("initializeCharts: animationsChart canvas context not found."); }

    const tasksStatusCtx = appShell.querySelector('#tasksStatusChart')?.getContext('2d');
    if (tasksStatusCtx) {
        console.log("initializeCharts: Recreating tasksDoughnutChartInstance.");
        tasksDoughnutChartInstance = new Chart(tasksStatusCtx, {
            type: 'doughnut',
            data: { labels: ['À faire', 'En cours', 'Terminé'], datasets: [{ label: 'Statuts des Tâches', data: [], backgroundColor: [infoColor, warningColor, successColor], borderColor: [infoColor, warningColor, successColor], borderWidth: 1 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top', labels: { color: textColor } }, tooltip: { callbacks: { label: context => `${context.label || ''}: ${context.parsed || 0}` } } } }
        });
    } else { console.warn("initializeCharts: tasksStatusChart canvas context not found."); }

    console.log("initializeCharts: Charts (re)created.");
    if (currentDashboardAnimations.length > 0 || currentDashboardTasks.length > 0 || allMembersData.length > 0) {
        console.log("initializeCharts: Forcing update of chart data after re-initialization due to existing data.");
        updateDashboardStatsAndCharts();
    }
}

// --- 5. LOAD INITIAL DATA & UPDATE UI ---
async function loadInitialDataAndUpdateDashboard() {
    if (!dbInstance || !appUser) { console.warn("loadInitialData: DB or User not ready."); return; }
    console.log("loadInitialDataAndUpdateDashboard: Loading all initial data...");
    try {
        const [members, rawAnimations, rawTasks] = await Promise.all([
            loadMembersFromModule(), loadAnimationsFromModule(), getAllTasksFromModule()
        ]);
        allMembersData = members;
        allRawAnimationsDataGlobal = rawAnimations;
        allRawTasksDataGlobal = rawTasks;
        setupDashboardYearSelector();
        await filterAndDisplayDashboardData();
        await populateTaskPageFiltersWithData(allRawAnimationsDataGlobal, allMembersData);
    } catch (error) {
        console.error("Error during loadInitialDataAndUpdateDashboard:", error);
    }
}

async function filterAndDisplayDashboardData() {
    console.log(`filterAndDisplayDashboardData: Filtering data for year: ${selectedDashboardYear}`);

    const animationsForYearRaw = allRawAnimationsDataGlobal.filter(anim => {
        if (!anim.dateTime || typeof anim.dateTime.toDate !== 'function') return false;
        return anim.dateTime.toDate().getFullYear() === selectedDashboardYear;
    });

    currentDashboardAnimations = animationsForYearRaw.filter(anim => anim.animationType !== "Réunion");
    const reunionsForYear = animationsForYearRaw.filter(anim => anim.animationType === "Réunion");
    currentDashboardReunionsCount = reunionsForYear.length;

    currentDashboardTasks = allRawTasksDataGlobal.filter(task => {
        let taskYear = null;
        if (task.createdAt && typeof task.createdAt.toDate === 'function') taskYear = task.createdAt.toDate().getFullYear();
        else if (task.dueDate && typeof task.dueDate.toDate === 'function') taskYear = task.dueDate.toDate().getFullYear();
        else if (task.createdAt && (typeof task.createdAt === 'number' || typeof task.createdAt === 'string')) { try { const d = new Date(task.createdAt); if (!isNaN(d.getTime())) taskYear = d.getFullYear(); } catch (e) {} }
        else if (task.dueDate && (typeof task.dueDate === 'number' || typeof task.dueDate === 'string')) { try { const d = new Date(task.dueDate); if (!isNaN(d.getTime())) taskYear = d.getFullYear(); } catch (e) {} }

        if (taskYear !== null) return taskYear === selectedDashboardYear;
        if (task.animationId) {
            const isLinkedToDisplayedAnimation = currentDashboardAnimations.some(a => a.id === task.animationId);
            const isLinkedToReunionOfYear = reunionsForYear.some(r => r.id === task.animationId);
            return isLinkedToDisplayedAnimation || isLinkedToReunionOfYear;
        }
        return false;
    });
    console.log("filterAndDisplayDashboardData: Filtered data ready.", { animsNonReunion: currentDashboardAnimations.length, reunions: currentDashboardReunionsCount, tasks: currentDashboardTasks.length });
    await updateDashboardStatsAndCharts();
}

async function updateDashboardStatsAndCharts() {
    if (!appShell.querySelector('#statsActiveMembers')) { console.warn("updateDashboardStatsAndCharts: Dashboard DOM not ready."); return; }
    console.log("updateDashboardStatsAndCharts: Updating for year:", selectedDashboardYear);

    appShell.querySelector('#statsActiveMembers').textContent = allMembersData.length;
    appShell.querySelector('#statsAnimationsCount').textContent = currentDashboardAnimations.length; // Animations hors réunions
    const reunionsCountEl = appShell.querySelector('#statsReunionsCount');
    if (reunionsCountEl) reunionsCountEl.textContent = currentDashboardReunionsCount;

    const totalTasksForYear = currentDashboardTasks.length;
    const todoTasksArrayForYear = currentDashboardTasks.filter(t => t.status === 'todo');
    const todoTasksCountForYear = todoTasksArrayForYear.length;
    const completedTasksCountForYear = currentDashboardTasks.filter(t => t.status === 'completed').length;

    appShell.querySelector('#statsTotalTasks').textContent = totalTasksForYear;
    appShell.querySelector('#statsTodoTasks').textContent = todoTasksCountForYear;

    const nextTodoTaskNameElement = appShell.querySelector('#nextTodoTaskName');
    if (nextTodoTaskNameElement) {
        if (todoTasksCountForYear > 0) {
            const sortedTodoTasks = todoTasksArrayForYear.sort((a, b) => {
                let timeA = Infinity;
                let timeB = Infinity;

                // Obtenir le temps pour a.createdAt
                if (a.createdAt && typeof a.createdAt.toDate === 'function') {
                    timeA = a.createdAt.toDate().getTime();
                } else if (a.createdAt && (typeof a.createdAt === 'number' || typeof a.createdAt === 'string')) {
                    try { const d = new Date(a.createdAt); if (!isNaN(d.getTime())) timeA = d.getTime(); } catch(e){}
                }

                // Obtenir le temps pour b.createdAt
                if (b.createdAt && typeof b.createdAt.toDate === 'function') {
                    timeB = b.createdAt.toDate().getTime();
                } else if (b.createdAt && (typeof b.createdAt === 'number' || typeof b.createdAt === 'string')) {
                    try { const d = new Date(b.createdAt); if (!isNaN(d.getTime())) timeB = d.getTime(); } catch(e){}
                }
                
                return timeA - timeB; // Tri ascendant (plus ancien en premier)
            });
            const nextTaskTitle = sortedTodoTasks[0].title || "Tâche sans titre";
            nextTodoTaskNameElement.textContent = `Prochaine : ${nextTaskTitle}`;
            nextTodoTaskNameElement.title = nextTaskTitle;
        } else {
            nextTodoTaskNameElement.textContent = "Aucune tâche à réaliser";
            nextTodoTaskNameElement.title = "";
        }
    }

    // ... (le reste de la fonction updateDashboardStatsAndCharts est identique à la version précédente)
    const monthlyAnimationCounts = {}; // Pour animations NON-réunions
    const monthlyAnimationBudgets = {}; // Budgets des tâches liées aux animations NON-réunions
    const tasksByAnimationIdForYear = currentDashboardTasks.reduce((acc, task) => {
        if (task.animationId) { (acc[task.animationId] = acc[task.animationId] || []).push(task); }
        return acc;
    }, {});

    for (const anim of currentDashboardAnimations) { // Uniquement animations non-réunions
        if (anim.dateTime?.toDate) { // Assurez-vous que dateTime est un Timestamp
            const monthIndex = anim.dateTime.toDate().getMonth();
            monthlyAnimationCounts[monthIndex] = (monthlyAnimationCounts[monthIndex] || 0) + 1;
            let budgetForAnim = 0;
            (tasksByAnimationIdForYear[anim.id] || []).forEach(task => budgetForAnim += (parseFloat(task.budget) || 0));
            monthlyAnimationBudgets[monthIndex] = (monthlyAnimationBudgets[monthIndex] || 0) + budgetForAnim;
        }
    }
    
    const totalBudgetCurrentYearTasks = currentDashboardTasks.reduce((sum, task) => sum + (parseFloat(task.budget) || 0), 0);
    const mainGridBudgetEl = appShell.querySelector('#statsTotalBudget');
    if (mainGridBudgetEl) mainGridBudgetEl.textContent = `${totalBudgetCurrentYearTasks.toFixed(2)}€`;
    
    const summaryRowBudgetEl = appShell.querySelector('#statsTotalBudgetTasks');
    if (summaryRowBudgetEl) summaryRowBudgetEl.textContent = `${totalBudgetCurrentYearTasks.toFixed(2)}€`;


    if (animationsBarChartInstance) {
        const monthLabels = Array.from({ length: 12 }, (_, i) => new Date(selectedDashboardYear, i).toLocaleString('fr-FR', { month: 'short' }));
        animationsBarChartInstance.data.labels = monthLabels;
        animationsBarChartInstance.data.datasets[0].data = monthLabels.map((_, i) => monthlyAnimationCounts[i] || 0);
        animationsBarChartInstance.data.datasets[1].data = monthLabels.map((_, i) => monthlyAnimationBudgets[i] || 0);
        if(animationsBarChartInstance.options.plugins.annotation) animationsBarChartInstance.options.plugins.annotation.annotations.line1.yScaleID = 'yBudget';
        animationsBarChartInstance.update();
    }
    if (tasksDoughnutChartInstance) {
        const tasksPendingForYear = currentDashboardTasks.filter(t => t.status === 'pending').length;
        tasksDoughnutChartInstance.data.datasets[0].data = [todoTasksCountForYear, tasksPendingForYear, completedTasksCountForYear];
        tasksDoughnutChartInstance.update();
    }

    const budgetAnnuelAlloue = 200 * 12;
    const budgetRestantAnnee = budgetAnnuelAlloue - totalBudgetCurrentYearTasks;
    const pourcentageDepense = budgetAnnuelAlloue > 0 ? (totalBudgetCurrentYearTasks / budgetAnnuelAlloue) * 100 : 0;
    appShell.querySelector('#annualBudgetCurrentYear').textContent = `(${selectedDashboardYear})`;
    appShell.querySelector('#annualBudgetAllocated').textContent = `${budgetAnnuelAlloue.toFixed(2)}€`;
    appShell.querySelector('#annualBudgetSpent').textContent = `${totalBudgetCurrentYearTasks.toFixed(2)}€`;
    const remainingEl = appShell.querySelector('#annualBudgetRemaining');
    if(remainingEl) {
        remainingEl.textContent = `${budgetRestantAnnee.toFixed(2)}€`;
        remainingEl.classList.toggle('negative', budgetRestantAnnee < 0);
    }
    const progressBarEl = appShell.querySelector('#annualBudgetProgressBar');
    if(progressBarEl) {
        progressBarEl.style.width = `${Math.min(100, Math.max(0, pourcentageDepense)).toFixed(2)}%`;
        progressBarEl.classList.toggle('overbudget', pourcentageDepense > 100);
    }
    console.log("updateDashboardStatsAndCharts: Dashboard UI & Annual Budget updated.");
}

// --- SPA NAVIGATION LOGIC ---
async function navigateToPage(pageId) {
    const mainAppContainer = appShell?.querySelector('#mainAppContainer');
    if (!appShell || !mainAppContainer) { console.error("navigateToPage: Critical app shell elements not found."); return; }
    console.log(`navigateToPage: To '${pageId}'`);
    appShell.querySelectorAll('header nav .nav-link.active').forEach(l => l.classList.remove('active'));
    appShell.querySelector(`header nav .nav-link[data-page="${pageId}"]`)?.classList.add('active');
    mainAppContainer.querySelectorAll('.page.active').forEach(p => p.classList.remove('active'));
    const targetPage = mainAppContainer.querySelector(`#${pageId}`);

    if (targetPage) {
        targetPage.classList.add('active');
        if (pageId === 'members') await loadMembersFromModule();
        else if (pageId === 'animations') await loadAnimationsFromModule();
        else if (pageId === 'tasks') {
            if (!allRawAnimationsDataGlobal.length && !allMembersData.length) await loadInitialDataAndUpdateDashboard();
            else await populateTaskPageFiltersWithData(allRawAnimationsDataGlobal, allMembersData);
            applyAndLoadTasksForPage();
        } else if (pageId === 'dashboard') {
            if (!allRawAnimationsDataGlobal.length && !allRawTasksDataGlobal.length) await loadInitialDataAndUpdateDashboard();
            else { setupDashboardYearSelector(); await filterAndDisplayDashboardData(); }
        }
    } else {
        console.warn(`Page ${pageId} not found, showing dashboard.`);
        mainAppContainer.querySelector('#dashboard')?.classList.add('active');
        appShell.querySelector('header nav .nav-link[data-page="dashboard"]')?.classList.add('active');
        await loadInitialDataAndUpdateDashboard();
    }
    if (typeof feather !== 'undefined') feather.replace();
}

// --- TASK PAGE FILTERS LOGIC ---
function applyAndLoadTasksForPage() {
    if (!appShell) return;
    const filters = {
        animationId: appShell.querySelector('#taskFilterAnimation')?.value || "",
        status: appShell.querySelector('#taskFilterStatus')?.value || "",
        assigneeId: appShell.querySelector('#taskFilterAssignee')?.value || ""
    };
    loadTasksForPage(filters);
}
async function populateTaskPageFiltersWithData(animations, members) {
    if (!appShell) return;
    const animSelect = appShell.querySelector('#taskFilterAnimation');
    const memberSelect = appShell.querySelector('#taskFilterAssignee');
    if (animSelect) {
        const current = animSelect.value; animSelect.innerHTML = '<option value="">Toutes</option>';
        animations.sort((a,b)=>(a.title||"").localeCompare(b.title||"")).forEach(a=>{ const o=document.createElement('option');o.value=a.id;o.textContent=a.title||"Sans titre";animSelect.appendChild(o); });
        if(Array.from(animSelect.options).some(o=>o.value===current)) animSelect.value=current;
    }
    if (memberSelect) {
        const current = memberSelect.value; memberSelect.innerHTML='<option value="">Tous</option>';
        members.sort((a,b)=>(`${a.firstname||""} ${a.lastname||""}`).localeCompare(`${b.firstname||""} ${b.lastname||""}`)).forEach(m=>{ const o=document.createElement('option');o.value=m.id;o.textContent=`${m.firstname||""} ${m.lastname||""}`.trim()||"Sans nom";memberSelect.appendChild(o); });
        if(Array.from(memberSelect.options).some(o=>o.value===current)) memberSelect.value=current;
    }
}

// --- MODAL MANAGEMENT ---
export function openModal(modalId, templateId) {
    let el = document.getElementById(modalId);
    if(currentOpenModalId && currentOpenModalId !== modalId) closeModal(currentOpenModalId);
    if(!el) { const t = document.getElementById(templateId); if(t){ document.body.appendChild(t.content.cloneNode(true)); el=document.getElementById(modalId); } else { console.error(`Template ${templateId} not found.`); return null; }}
    if(el) { currentOpenModalId=modalId; el.classList.add('active'); const newEl=el.cloneNode(true); el.parentNode.replaceChild(newEl,el); el=newEl; el.querySelector('.modal-close')?.addEventListener('click',()=>closeModal(modalId)); el.querySelector('.modal-cancel-btn')?.addEventListener('click',()=>closeModal(modalId)); el.addEventListener('click',e=>{if(e.target===el)closeModal(modalId);}); el.querySelector('.modal')?.addEventListener('click',e=>e.stopPropagation()); if(typeof feather!=='undefined')feather.replace(); return el; } return null;
}
export function closeModal(modalId) {
    const el=document.getElementById(modalId); if(el){ el.classList.remove('active'); setTimeout(()=>{if(el.parentElement)el.remove();},300); if(currentOpenModalId===modalId)currentOpenModalId=null;}
}

// --- GLOBAL EVENT LISTENERS ---
document.addEventListener('tasksUpdated', async () => {
    console.log("Global event: tasksUpdated received.");
    allRawTasksDataGlobal = await getAllTasksFromModule();
    await filterAndDisplayDashboardData(); // Refiltrer et mettre à jour le dashboard
    if (appShell?.querySelector('#tasks.page.active')) {
        applyAndLoadTasksForPage(); // Mettre à jour la page des tâches si active
    }
});

document.addEventListener('animationsUpdated', async () => {
    console.log("Global event: animationsUpdated received.");
    allRawAnimationsDataGlobal = await loadAnimationsFromModule();
    setupDashboardYearSelector(); // Mettre à jour les années disponibles
    await filterAndDisplayDashboardData(); // Refiltrer et mettre à jour le dashboard
    await populateTaskPageFiltersWithData(allRawAnimationsDataGlobal, allMembersData); // Mettre à jour les filtres de la page tâches

    if (appShell?.querySelector('#animations.page.active')) {
        await loadAnimationsFromModule(); // Mettre à jour la page animations si active
    }
});

document.addEventListener('membersUpdated', async () => {
    console.log("Global event: membersUpdated received.");
    allMembersData = await loadMembersFromModule();
    if (appShell?.querySelector('#dashboard.page.active')) {
        // Seules les stats membres sont directement affectées, updateDashboardStatsAndCharts gère le reste
        await updateDashboardStatsAndCharts();
    }
    await populateTaskPageFiltersWithData(allRawAnimationsDataGlobal, allMembersData); // Mettre à jour les filtres de la page tâches

    if (appShell?.querySelector('#members.page.active')) {
        await loadMembersFromModule(); // Mettre à jour la page membres si active
    }
});

// --- APP ENTRY POINT ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: App starting.");
    applyInitialTheme(); // Appliquer le thème avant toute autre chose
    if (typeof feather !== 'undefined') feather.replace();
    listenToAuthChanges(initializeApp, onUserSignedOut);
});
