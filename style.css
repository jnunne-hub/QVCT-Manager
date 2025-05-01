/* ====================================================== */
/*    STYLE.CSS COMPLET (v30 - Refactorisation Cartes)    */
/* ====================================================== */

/* #region --- Variables et Styles de Base --- */
:root {
   /* Palette Principale */
    --primary-color: #6C9D7E; /* Vert sauge doux */
    --secondary-color: #A8D8B9; /* Vert d'eau clair */
    --accent-color: #F7C873; /* Ocre / Moutarde doux */
    --background-color: #F9F9F9; /* Blanc cassé / Très léger gris */
    --header-bg: #FFFFFF; /* Fond du header */
    --footer-bg: #F0F4F1; /* Fond du footer */
    --text-color: #4A4A4A; /* Gris anthracite foncé */
    --text-light: #FFFFFF;
    --text-muted: #88939E; /* Gris clair pour textes secondaires */
    --border-color: #EAEAEA; /* Gris clair bordures */
    --hover-light: #F0F4F1; /* Survol sidebar/listes */

    /* Ombres Douces */
    --shadow-color-soft: rgba(108, 157, 126, 0.08); /* Ombre verte très douce */
    --shadow: 0 3px 8px var(--shadow-color-soft);
    --card-shadow: 0 5px 15px var(--shadow-color-soft);
    --card-hover-shadow: 0 10px 25px rgba(108, 157, 126, 0.12); /* Ombre survol plus marquée */

    /* Couleurs Status / Alertes (Subtiles) */
    --danger-color: #E87E7E; /* Rouge corail doux */
    --success-color: #87C7A1; /* Vert succès doux */
    --warning-color: var(--accent-color);
    --info-color: #88BBD6; /* Bleu ciel doux */
    --neutral-color: #B0BEC5; /* Gris bleuté neutre */
    --link-color: #7E8DCC; /* Bleu lavande doux */

     /* Rayons de bordure */
     --border-radius-small: 6px;
     --border-radius-medium: 10px;
     --border-radius-large: 12px;

     /* Dimensions Header/Footer */
     --header-height: 65px;
}

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
}
/* #endregion */

/* #region --- Structure Globale & Layout --- */
.site-wrapper {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
}

/* Header */
.app-header {
    background-color: var(--header-bg);
    height: var(--header-height);
    padding: 0 25px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    box-shadow: var(--shadow); /* Ombre plus douce pour header */
    position: sticky;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1001;
    border-bottom: 1px solid var(--border-color);
}
.header-brand {
    display: flex;
    align-items: center;
}
#header-logo {
    height: 40px;
    max-height: 80%;
    width: auto;
    margin-right: 15px;
}
.app-header h1 {
    font-size: 1.3em;
    color: var(--primary-color);
    margin: 0;
    white-space: nowrap;
}
.app-header h1 i {
    margin-right: 8px;
}
.header-nav ul {
    list-style: none;
    display: flex;
    gap: 5px;
    margin: 0;
    padding: 0;
}
.header-nav li { margin: 0; }
.header-nav a {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 10px;
    color: var(--text-muted);
    text-decoration: none;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    transition: background-color 0.3s ease, color 0.3s ease;
}
.header-nav a i { font-size: 1.1em; margin: 0; }
.header-nav a .nav-text { display: none; }
.header-nav a:hover { background-color: var(--hover-light); color: var(--primary-color); }
.header-nav a.active { background-color: var(--primary-color); color: var(--text-light); }
.header-auth { display: flex; align-items: center; }

/* Main Content */
.main-content {
    flex-grow: 1;
    padding: 30px;
    padding-bottom: 90px; /* Espace pour footer fixe */
}

/* Footer */
.app-footer {
    background-color: var(--footer-bg);
    padding: 7px 25px;
    border-top: 1px solid var(--border-color);
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: auto;
}
#footer-auth-container { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; }
#user-info { align-items: center; font-size: 0.8em; margin-bottom: 0; } /* display:flex vient de .modal */
#user-info img { width: 20px; height: 20px; border-radius: 50%; vertical-align: middle; margin-right: 8px; }
#login-btn { margin: 0; width: auto; padding: 6px 12px; font-size: 0.9em; }
#logout-btn { margin-left: 10px; }
.copyright-text { font-size: 0.8em; color: var(--text-muted); text-align: right; flex-shrink: 0; }
/* #endregion */

/* #region --- Styles Pages (Contenu Principal) --- */
.page {
    display: none;
    animation: fadeIn 0.5s ease-in-out;
}
.page.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

h2 {
    color: var(--primary-color);
    margin-bottom: 20px;
    border-bottom: 2px solid var(--secondary-color);
    padding-bottom: 10px;
}
h2 i { margin-right: 10px; }
/* #endregion */

/* #region --- Éléments UI Communs --- */
/* Boutons */
.btn { padding: 10px 18px; border: none; border-radius: 5px; cursor: pointer; font-size: 0.95em; transition: background-color 0.3s ease, transform 0.1s ease; margin: 5px 5px 15px 0; display: inline-flex; align-items: center; justify-content: center; line-height: 1.2; vertical-align: middle; white-space: nowrap; }
.btn i { margin-right: 8px; }
.btn:disabled { background-color: #ccc; cursor: not-allowed; opacity: 0.7; }
.btn:active:not(:disabled) { transform: scale(0.98); }
.primary-btn { background-color: var(--primary-color); color: var(--text-light); }
.primary-btn:hover:not(:disabled) { background-color: #5a8a6e; } /* Slightly darker primary */
.secondary-btn { background-color: var(--secondary-color); color: var(--text-color); }
.secondary-btn:hover:not(:disabled) { background-color: #95ccac; } /* Slightly darker secondary */
.success-btn { background-color: var(--success-color); color: var(--text-light); }
.success-btn:hover:not(:disabled) { background-color: #73b88e; } /* Slightly darker success */
.danger-btn { background-color: var(--danger-color); color: var(--text-light); }
.danger-btn:hover:not(:disabled) { background-color: #e06767; } /* Slightly darker danger */
.btn.btn-small { padding: 4px 8px; font-size: 0.8em; margin: 0; }
.btn.btn-small i { margin-right: 4px; }

/* Conteneurs de Listes/Grilles */
.list-container { margin-top: 20px; }
.list-container > p { /* Message chargement/vide */ grid-column: 1 / -1; width: 100%; text-align: center; color: #777; font-style: italic; padding: 40px 0; }

/* Filtres */
.filter-container { margin-bottom: 20px; display: flex; align-items: center; flex-wrap: wrap; gap: 10px 15px; }
.filter-container label { margin-right: 5px; font-weight: bold; }
.filter-container select, .filter-container input[type="search"] { padding: 8px 12px; border: 1px solid var(--border-color); border-radius: 5px; font-size: 0.95em; background-color: #fff; }
.filter-container select { min-width: 180px; }
.filter-container input[type="search"] { min-width: 200px; }

/* Modales */
.modal { display: none; position: fixed; z-index: 1000; left: 0; top: 0; width: 100%; height: 100%; overflow: auto; background-color: rgba(0,0,0,0.5); animation: fadeInModal 0.3s ease-in-out; }
@keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
.modal-content { background-color: #fefefe; margin: 8% auto; padding: 30px 40px; border: 1px solid var(--border-color); width: 90%; border-radius: 8px; position: relative; box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
#member-form-modal .modal-content, #task-form-modal .modal-content { max-width: 550px; }
#animation-form-modal .modal-content, #document-form-modal .modal-content { max-width: 650px; } /* Ajout document */
#task-list-modal .modal-content { max-width: 700px; }
.modal-lg { max-width: 800px; }
.close-btn { color: #aaa; position: absolute; top: 10px; right: 20px; font-size: 28px; font-weight: bold; cursor: pointer; line-height: 1; z-index: 10; }
.close-btn:hover, .close-btn:focus { color: black; text-decoration: none; }

/* Formulaires Modales */
.modal form { margin-top: 15px; }
.modal form label { display: block; margin-top: 15px; margin-bottom: 5px; font-weight: bold; color: #555; font-size: 0.95em; }
.modal form label:not([for]) { margin-bottom: 8px; }
.modal form input[type="text"], .modal form input[type="email"], .modal form input[type="url"], .modal form input[type="datetime-local"], .modal form input[type="date"], .modal form input[type="number"], .modal form select, .modal form textarea { width: 100%; padding: 12px; border: 1px solid var(--border-color); border-radius: 5px; font-size: 1em; font-family: inherit; margin-bottom: 10px; background-color: #fff; transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out; }
.modal form input:focus, .modal form select:focus, .modal form textarea:focus { border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(108, 157, 126, 0.2); outline: none; }
.modal form textarea { min-height: 80px; resize: vertical; line-height: 1.5; }
.modal form button[type="submit"] { margin-top: 25px; width: 100%; padding: 12px; font-size: 1.1em; }

/* Checkbox List */
.checkbox-list { max-height: 160px; overflow-y: auto; border: 1px solid var(--border-color); padding: 15px; margin-top: 0; margin-bottom: 15px; background-color: #fdfdfd; border-radius: 4px; }
.checkbox-list label { display: block; margin-bottom: 10px; font-weight: normal; cursor: pointer; margin-top: 0; font-size: 0.9em; line-height: 1.3; }
.checkbox-list label:last-child { margin-bottom: 0; }
.checkbox-list input[type="checkbox"] { margin-right: 10px; vertical-align: middle; width: 16px; height: 16px; cursor: pointer; }
.checkbox-list p { color: #888; font-style: italic; text-align: center; margin: 10px 0; }

/* Styles Imgur Upload (pour section documents) */
#imgur-status { margin-left: 10px; font-size: 0.85em; font-style: italic; }
#imgur-status.error { color: var(--danger-color); font-weight: bold; }
#imgur-status.success { color: var(--success-color); }

/* Modale Tâches Liées (Task List Modal) */
#task-list-modal h3 { color: var(--primary-color); margin-bottom: 20px; padding-bottom: 10px; border-bottom: 1px solid var(--border-color); }
.modal-task-list-container { margin-top: 15px; max-height: 60vh; overflow-y: auto; padding-right: 10px; }
.modal-task-item { padding: 12px 0; border-bottom: 1px dashed var(--border-color); display: flex; flex-direction: column; gap: 5px; }
.modal-task-item:last-child { border-bottom: none; }
.modal-task-item .task-desc { font-weight: 600; color: var(--text-color); font-size: 1em; }
.modal-task-item .task-detail { font-size: 0.85em; color: #666; display: flex; align-items: center; }
.modal-task-item .task-detail i { width: 16px; text-align: center; margin-right: 8px; color: var(--neutral-color); opacity: 0.9; }
.modal-task-item .task-detail i.fa-user, .modal-task-item .task-detail i.fa-users { color: var(--info-color); }
.modal-task-item .task-detail i.fa-clock { color: var(--danger-color); opacity: 0.8;}
.modal-task-item .task-detail i.fa-check-circle { color: var(--success-color); }
.modal-task-item .task-detail i.fa-spinner { color: var(--primary-color); animation: fa-spin 2s infinite linear; }
.modal-task-item .task-detail i.fa-circle { color: var(--warning-color); }
.modal-task-item .task-detail .text-danger { color: var(--danger-color); font-weight: bold; }
.modal-task-list-container > p { text-align: center; color: #888; font-style: italic; padding: 30px 0; }

/* Badges */
.badge { display: inline-block; padding: 0.3em 0.6em; font-size: 0.75em; font-weight: bold; line-height: 1; color: #fff; text-align: center; white-space: nowrap; vertical-align: baseline; border-radius: 0.8rem; margin-left: 5px; }
.badge.danger { background-color: var(--danger-color); }
.badge.budget-badge { background-color: var(--success-color); }

/* Chart Error Messages */
.chart-error-message { font-size: 0.9em; text-align: center; margin-top: 15px; font-style: italic; color: #888; }
.chart-error-message.error { color: var(--danger-color); font-weight: bold; }
/* #endregion */

/* #region --- Styles Dashboard --- */
.dashboard-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 20px; margin-top: 20px; }
.summary-card { background-color: #fff; padding: 20px 25px; border-radius: 8px; box-shadow: var(--shadow); border-left-style: solid; border-left-width: 5px; display: flex; flex-direction: column; }
/* Couleurs spécifiques bordures */
.summary-card:nth-child(1) { border-left-color: var(--accent-color); } .summary-card:nth-child(1) h3 i { color: var(--accent-color); } .summary-card:nth-child(1) p:first-of-type { color: var(--accent-color); }
.summary-card:nth-child(2) { border-left-color: var(--primary-color); } .summary-card:nth-child(2) h3 i { color: var(--primary-color); } .summary-card:nth-child(2) p:first-of-type { color: var(--primary-color); }
.summary-card:nth-child(3) { border-left-color: var(--danger-color); } .summary-card:nth-child(3) h3 i { color: var(--danger-color); } .summary-card:nth-child(3) p:first-of-type { display: none; }
.summary-card:nth-child(4) { border-left-color: var(--success-color); } .summary-card:nth-child(4) h3 i { color: var(--success-color); } .summary-card:nth-child(4) p#planned-budget-total { color: var(--success-color); font-size: 2.2em; }
.summary-card.chart-card { border-left-color: var(--link-color); } .summary-card.chart-card h3 i { color: var(--link-color); }
.summary-card.annual-budget-card { border-left-color: var(--info-color); } .summary-card.annual-budget-card h3 i { color: var(--info-color); } .summary-card.annual-budget-card p#remaining-annual-budget { color: var(--info-color); font-size: 2.2em; }

.summary-card h3 { margin-bottom: 15px; font-size: 1.15em; color: #444; display: flex; align-items: center; justify-content: space-between; }
.summary-card h3 i { margin-right: 10px; font-size: 1.2em; opacity: 0.8; }
.summary-card p:first-of-type { font-size: 2.5em; font-weight: bold; margin-bottom: 15px; line-height: 1; text-align: center; }
.summary-card ul { list-style: none; padding-left: 0; font-size: 0.9em; flex-grow: 1; margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 15px; }
.summary-card:nth-child(3) ul { margin-top: 0; border-top: none; padding-top: 0; } /* Pas de bordure pour échéances */
.summary-card li { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px dashed #eee; line-height: 1.4; }
.summary-card li:last-child { margin-bottom: 0; padding-bottom: 0; border-bottom: none; }
.summary-card li.no-items { color: #888; font-style: italic; text-align: center; border-bottom: none; padding: 15px 0; }
.dashboard-date { font-weight: bold; color: #555; margin-right: 8px; }
.dashboard-name { color: #777; font-style: italic; margin-left: 5px; }
.dashboard-status { font-style: italic; font-size: 0.9em; margin-left: 5px; }
.dashboard-status.realisee { color: var(--success-color); }
.dashboard-status.annulee { color: var(--danger-color); }
#deadlines-list .overdue { color: var(--danger-color); font-weight: bold; }
#deadlines-list .due-soon { color: var(--warning-color); }
.dashboard-details-text { font-size: 0.8em; color: #777; text-align: center; margin-top: 5px; line-height: 1.3; border-top: none; padding-top: 0; }
#budget-details-info { font-size: 0.7em; }
#remaining-budget-details { font-size: 0.7em; }
.dashboard-details-text.loading-error { font-style: italic; color: #a0a0a0; }
.summary-card.chart-card { padding: 15px 20px; }
.summary-card.chart-card h3 { text-align: center; margin-bottom: 20px; justify-content: center; }
.chart-container.dashboard-chart-container { position: relative; height: 250px; width: 100%; }
.calendar-wrapper { margin-top: 0; background-color: #fff; padding: 25px; border-radius: var(--border-radius-large); box-shadow: var(--card-shadow); border: 1px solid var(--border-color); }
.dashboard-summary > .grid-full-width { grid-column: 1 / -1; }
.calendar-wrapper h3 { text-align: center; color: var(--primary-color); margin-bottom: 25px; font-size: 1.2em; font-weight: 600; }
.calendar-wrapper h3 i { margin-right: 10px; opacity: 0.85; }
#dashboard-calendar { min-height: 450px; width: 100%; max-width: none; margin: 0; }
/* #endregion */

/* #region --- Styles Cartes Génériques --- */
.animation-card, .task-card, .member-card, .document-card {
    background-color: #fff;
    border-radius: var(--border-radius-medium);
    box-shadow: var(--card-shadow);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.2s ease-out, box-shadow 0.2s ease-out;
    border-left-style: solid;
    border-left-width: 5px;
    min-height: 180px; /* Hauteur minimale de base */
}
.animation-card:hover, .task-card:hover, .member-card:hover, .document-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--card-hover-shadow);
}
.animation-card .card-body, .task-card .card-body, .member-card .card-body, .document-card .card-body {
    padding: 15px 18px; /* Padding unifié */
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 10px; /* Espacement unifié */
}
.animation-card .card-footer, .task-card .card-footer, .member-card .card-footer, .document-card .card-footer {
    padding: 8px 15px; /* Padding unifié */
    background-color: #f9fafb; /* Fond unifié */
    border-top: 1px solid var(--border-color);
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 8px;
}
.animation-card .card-footer .btn, .task-card .card-footer .btn, .member-card .card-footer .btn, .document-card .card-footer .btn {
    margin: 0; /* Annuler marges */
    /* Utilise .btn-small via HTML */
}
.animation-card .detail-item, .task-card .card-detail, .member-card .member-detail, .document-card .card-detail {
    display: flex;
    align-items: flex-start;
    font-size: 0.85em;
    color: #555;
    line-height: 1.4;
}
.animation-card .detail-item i, .task-card .card-detail i, .member-card .member-detail i, .document-card .card-detail i {
    width: 16px;
    text-align: center;
    margin-right: 8px;
    color: var(--text-muted);
    flex-shrink: 0;
    margin-top: 2px;
}
.animation-card .detail-item span, .task-card .card-detail span, .member-card .member-detail span, .document-card .card-detail span, .document-card .card-detail a {
    word-break: break-word;
}
.animation-card .card-header h3, .task-card .task-description, .member-card .member-name, .document-card .doc-title {
    font-weight: 600;
    color: var(--primary-color);
    font-size: 1.05em; /* Taille de base titre */
    line-height: 1.4;
    margin: 0 0 8px 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
/* #endregion */

/* #region --- Styles Spécifiques Cartes --- */
/* Grilles */
.animation-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 25px; }
.task-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.member-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }
.document-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; }

/* Animations */
.animation-card { min-height: 270px; } /* Plus haute */
.animation-card.status-prévue { border-left-color: var(--accent-color); }
.animation-card.status-en-cours { border-left-color: var(--secondary-color); }
.animation-card.status-réalisée { border-left-color: var(--success-color); }
.animation-card.status-annulée { border-left-color: var(--danger-color); }
.animation-card .card-header { padding: 15px 20px; border-bottom: 1px solid var(--border-color); background-color: rgba(108, 157, 126, 0.05); }
.animation-card .card-header h3 { margin-bottom: 0; font-size: 1.2em; } /* Titre plus grand */
.animation-card .card-body { gap: 12px; padding: 15px 20px; } /* Padding/gap spécifiques si besoin */
.card-details-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 15px; padding-bottom: 8px; border-bottom: 1px dashed #eee; }
.card-details-row:last-of-type { border-bottom: none; padding-bottom: 0; }
.card-details-row.compact .detail-item.location { min-width: 70px; flex-shrink: 1; }
.card-details-row.secondary { margin-bottom: 5px; }
.card-details-row.secondary .detail-item { font-size: 0.8em; color: #777; }
.card-details-row.secondary .detail-item i { opacity: 0.65; margin-right: 4px; }
.detail-item.date i { color: var(--primary-color); } .detail-item.type i { color: var(--secondary-color); } .detail-item.location i { color: var(--accent-color); } .detail-item.status i { color: var(--neutral-color); } .detail-item.budget i { color: var(--warning-color); } .detail-item.participants i { color: var(--info-color); } .detail-item.docs i { color: var(--link-color); }
.animation-card .card-description { font-size: 0.9em; color: #555; line-height: 1.5; margin-top: 5px; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 4; /* Moins de lignes */ overflow: hidden; text-overflow: ellipsis; }
.card-description.no-description { color: #999; font-style: italic; -webkit-line-clamp: 2; }
.animation-card .show-tasks-btn { background-color: #6c757d; color: var(--text-light); }
.animation-card .show-tasks-btn:hover:not(:disabled) { background-color: #5a6268; }

/* Tâches */
.task-card { border-left-color: var(--neutral-color); } /* Couleur par défaut */
.task-card.status-à-faire { border-left-color: var(--warning-color); }
.task-card.status-en-cours { border-left-color: var(--primary-color); }
.task-card.status-terminé { border-left-color: var(--neutral-color); opacity: 0.7; }
.task-card.status-terminé .task-description { text-decoration: line-through; }
.task-card .card-detail i.fa-link { color: var(--secondary-color); opacity: 1; }
.task-card .card-detail i.fa-user, .task-card .card-detail i.fa-users { color: var(--info-color); opacity: 1; }
.task-card .card-detail i.fa-clock { color: var(--danger-color); opacity: 0.8; }
.task-card .card-detail i.fa-info-circle { color: var(--neutral-color); opacity: 1;}
.task-card .card-detail i.fa-euro-sign { color: var(--warning-color); } /* Pour budget tâche */

/* Membres */
.member-card { border-left-color: var(--info-color); min-height: 160px; }
.member-card .card-body { padding: 15px 20px; gap: 10px; } /* Padding spécifique si besoin */
.member-card .member-detail i { color: var(--info-color); opacity: 0.8; }

/* Documents */
.document-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); /* Légèrement plus large pour miniature */
    gap: 25px;
}

/* Styles communs de la carte (hérités de la section générique) */
.document-card {
    /* background, radius, shadow, flex-direction, overflow, transition => Gérés par style générique */
    border-left-color: var(--link-color); /* Spécifique */
     min-height: 160px; /* Hauteur minimale peut être plus petite avec miniature */
}
.document-card:hover {
    /* transform, box-shadow => Gérés par style générique */
}

/* Corps de la carte AVEC miniature */
.document-card .card-body.doc-card-body-with-thumb {
    padding: 15px; /* Padding uniforme */
    flex-grow: 1;
    display: flex; /* Activer Flexbox */
    align-items: flex-start; /* Aligner en haut */
    gap: 15px; /* Espace entre miniature et infos */
}

/* Conteneur pour la miniature/icône */
.document-card .doc-thumbnail {
    flex-shrink: 0;
    width: 75px;
    height: 75px;
    background-color: #f0f4f1;
    border-radius: var(--border-radius-small);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border: 1px solid var(--border-color);
}

/* Image miniature */
.document-card .doc-thumbnail img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}
.document-card:hover .doc-thumbnail img {
    transform: scale(1.05);
}

/* Icône placeholder */
.document-card .doc-thumbnail i {
    color: var(--text-muted);
    opacity: 0.7;
    /* La taille fa-3x est définie dans le JS */
}

/* Conteneur pour les informations textuelles */
.document-card .doc-info {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    gap: 6px; /* Espace vertical entre détails */
    min-width: 0; /* Empêche le débordement */
}

/* Titre dans le bloc info */
.document-card .doc-title {
    /* font-size, weight, color, margin, overflow => Hérités du style générique .doc-title */
    margin-bottom: 5px; /* Ajuster marge si nécessaire */
}
.document-card .doc-title i {
    /* margin, opacity, width, text-align => Hérités du style générique */
    color: var(--link-color); /* Spécifique */
}

/* Détails dans le bloc info */
.document-card .doc-info .card-detail {
    /* display, align-items, font-size, color, line-height => Hérités du style générique */
}
.document-card .doc-info .card-detail i {
    /* width, text-align, margin-right, color(défaut), flex-shrink, margin-top => Hérités */
}
/* Couleurs spécifiques */
.document-card .doc-info .card-detail i.fa-calendar-plus { color: var(--secondary-color); }
.document-card .doc-info .card-detail i.fa-tasks,
.document-card .doc-info .card-detail i.fa-calendar-alt { color: var(--info-color); }
.document-card .doc-info .card-detail i.fa-info-circle { color: var(--neutral-color); }

/* Footer (hérite des styles génériques .card-footer) */
.document-card .card-footer {
     /* padding, background, border, margin, display, justify, align, gap => Hérités */
}
.document-card .card-footer .btn {
    /* margin, styles .btn-small => Hérités/appliqués par HTML */
}

/* #region --- Section Statistiques --- */
#stats .stats-container { margin-bottom: 30px; }
#stats .stat-card { border-radius: 8px; /* Garder bordures dashboard */ }
#stats .stat-card h3 i { color: inherit; }
#stats .stat-card:nth-child(1) { border-left-color: var(--success-color); } #stats .stat-card:nth-child(1) h3 i, #stats .stat-card:nth-child(1) p { color: var(--success-color); }
#stats .stat-card:nth-child(2) { border-left-color: var(--info-color); } #stats .stat-card:nth-child(2) h3 i, #stats .stat-card:nth-child(2) p { color: var(--info-color); }
#stats .stat-card:nth-child(3) { border-left-color: var(--warning-color); } #stats .stat-card:nth-child(3) h3 i, #stats .stat-card:nth-child(3) p { color: var(--warning-color); }
.stats-details-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; background-color: #fff; padding: 25px; border-radius: 8px; box-shadow: var(--shadow); align-items: start; }
.stat-chart-block { background-color: #fff; padding: 20px; border-radius: 8px; box-shadow: var(--shadow); display: flex; flex-direction: column; }
.stat-chart-block.full-width { grid-column: 1 / -1; }
.stat-chart-block h4 { font-size: 1.1em; color: var(--primary-color); margin-bottom: 20px; padding-bottom: 8px; border-bottom: 1px solid var(--border-color); text-align: center; }
.stat-chart-block h4 i { margin-right: 8px; opacity: 0.8; }
.chart-container { position: relative; height: 280px; width: 100%; }
.chart-container.large { height: 400px; }
.chart-container canvas { max-width: 100%; max-height: 100%; }
.export-buttons { margin-top: 40px; padding-top: 20px; border-top: 1px solid var(--border-color); text-align: center; }
.export-buttons .btn { margin: 0 10px; }
/* #endregion */

/* #region --- Styles Responsive --- */
@media (max-width: 1200px) { .main-content { padding: 25px; padding-top: calc(var(--header-height) + 25px); padding-bottom: 75px; } .dashboard-summary { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); } .app-header { padding: 0 20px; } .app-footer { padding: 8px 20px; } }
@media (max-width: 992px) { .app-header { padding: 0 15px; height: auto; min-height: 55px; flex-wrap: wrap; position: sticky; } #header-logo { height: 35px; margin-right: 10px; } .app-header h1 { font-size: 1.2em; margin-bottom: 5px; } .header-brand { flex-shrink: 1; } .header-nav { width: 100%; order: 3; justify-content: center; margin-top: 5px; } .header-nav ul { justify-content: center; flex-wrap: wrap; } .header-nav a { width: 38px; height: 38px; padding: 8px; } .header-nav a i { font-size: 1em; } .header-auth { margin-left: auto; order: 2; } .main-content { padding: 20px; padding-top: 85px; padding-bottom: 70px; } .dashboard-summary { grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); } .stats-details-container { grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); } .app-footer { padding: 7px 15px; justify-content: center; text-align: center; } #footer-auth-container { justify-content: center; order: 1; margin-bottom: 5px; } .copyright-text { width: 100%; text-align: center; order: 2; font-size: 0.75em; } .modal-content { margin: 10% auto; width: 90%; padding: 25px; } .animation-grid, .task-grid, .member-grid, .document-grid { gap: 18px; } }
@media (max-width: 767px) { .app-header { min-height: 50px; } .app-header h1 { display: none !important; } #header-logo { height: 30px; } .header-nav ul { gap: 2px; justify-content: space-around; } .header-nav a { width: 36px; height: 36px; } .main-content { padding: 15px; padding-top: 80px; padding-bottom: 65px; } .dashboard-summary, .stats-details-container, .animation-grid, .task-grid, .member-grid, .document-grid { grid-template-columns: 1fr; gap: 15px; } .summary-card.chart-card, .stat-chart-block.full-width { grid-column: 1 / -1; } .app-footer { padding: 6px 10px; flex-direction: column; } #footer-auth-container { margin-bottom: 8px; } .copyright-text { font-size: 0.7em; } .modal-content { margin: 8% auto; width: 95%; padding: 20px; } .modal form label { font-size: 0.9em; } .modal form input, .modal form select, .modal form textarea { padding: 10px; } .modal form button[type="submit"] { padding: 10px; font-size: 1em;} .checkbox-list { max-height: 140px; } .filter-container { flex-direction: column; align-items: stretch; } .filter-container label { margin-bottom: 3px; } .filter-container select, .filter-container input[type="search"] { width: 100%; min-width: 0;} }
@media (max-width: 480px) { .app-header { padding: 0 10px; } .app-header h1 { display: none; } #header-logo { height: 28px; margin-right: 8px; } .header-nav ul { gap: 1px; } .header-nav a { width: 34px; height: 34px; padding: 5px; } .header-nav a i { font-size: 0.9em; } .main-content { padding: 10px; padding-top: 75px; padding-bottom: 60px; } /* Tailles textes cartes */ .summary-card h3 { font-size: 1em; } .summary-card p { font-size: 2em; } .animation-card .card-header h3, .task-card .task-description, .member-card .member-name, .document-card .doc-title { font-size: 1em; } .animation-card .detail-item, .task-card .card-detail, .member-card .member-detail, .document-card .card-detail { font-size: 0.8em; } .animation-card .card-description { font-size: 0.85em; -webkit-line-clamp: 3; } .card-footer .btn { font-size: 0.8em; padding: 5px 8px;} .modal-content { margin: 5% auto; padding: 15px; } .checkbox-list { max-height: 120px; } }
/* #endregion */

/* #region --- Animations & Utilitaires --- */
/* Classe utilitaire pour masquer initialement les cartes pour l'animation */
.card-hidden {
    opacity: 0;
    transform: translateY(20px);
    /* La transition est définie sur la carte elle-même */
}
/* Animation spinner */
@keyframes fa-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
/* #endregion */
