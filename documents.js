// --- START OF FILE documents.js ---
'use strict';

/**
 * Logique pour la section Documents & Ressources v2
 * Correction: Accès à animateCardEntry via paramètres d'initialisation.
 */

// Références globales pour ce module (initialisées dans initDocumentsPage)
let dbDocuments; // Référence collection Firestore 'documents'
let currentUserEmail;
let currentUserDisplayName;
let getCachedTasksFunc; // Fonction pour obtenir le cache des tâches depuis script.js
let getCachedAnimationsFunc; // Fonction pour obtenir le cache des animations depuis script.js
let _openModal; // Variable pour stocker la fonction openModal
let _closeModal; // Variable pour stocker la fonction closeModal
let _animateCardEntry; // Variable pour stocker animateCardEntry

// --- AJOUT: Configuration Imgur ---
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!! ATTENTION : METTRE VOTRE CLIENT ID IMGUR CI-DESSOUS      !!!
// !!! C'EST MOINS SÉCURISÉ DE LE METTRE ICI. UNE SOLUTION     !!!
// !!! BACKEND EST FORTEMENT RECOMMANDÉE POUR LA PRODUCTION.   !!!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
const IMGUR_CLIENT_ID = "d6129b56d060c8f"; // Remplace par ton vrai Client ID
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!


// Références DOM spécifiques aux documents
const documentListDiv = document.getElementById('document-list');
const addDocumentBtn = document.getElementById('add-document-btn');
const documentModal = document.getElementById('document-form-modal');
const documentForm = document.getElementById('document-form');
const documentFormTitle = document.getElementById('document-form-title');
const hiddenDocumentIdInput = document.getElementById('document-id');
const docTypeFilterSelect = document.getElementById('doc-type-filter');
const docSearchInput = document.getElementById('doc-search');
const docFilterBtn = document.getElementById('doc-filter-btn');
const documentTypeSelect = document.getElementById('document-type'); // Dans la modale
const documentLinkingSection = document.getElementById('document-linking-section');
const documentLinkLabel = document.getElementById('document-link-label');
const documentLinkedItemSelect = document.getElementById('document-linked-item');
// --- AJOUT: Références DOM Imgur ---
const imgurUploadBtn = document.getElementById('imgur-upload-btn');
const imgurUploadInput = document.getElementById('imgur-upload-input');
const imgurStatusSpan = document.getElementById('imgur-status');
const documentUrlInput = document.getElementById('document-url'); // Référence utile
// --- FIN AJOUT ---


let editingDocumentId = null; // Pour savoir si on édite

/**
 * Initialise la page des documents (appelée depuis script.js)
 * Accepte maintenant animateCardEntryFunc
 */
function initDocumentsPage(dbRef, user, getTasks, getAnims, openModalFunc, closeModalFunc, animateCardEntryFunc) {
    console.log("Initialisation de la section Documents...");
    if (!dbRef || !user || typeof openModalFunc !== 'function' || typeof closeModalFunc !== 'function' || typeof animateCardEntryFunc !== 'function') {
        console.error("Erreur initDocumentsPage: Références ou fonctions modales/animation manquantes.");
        if(documentListDiv) documentListDiv.innerHTML = "<p>Erreur d'initialisation.</p>";
        return;
    }
    dbDocuments = dbRef.collection('documents');
    currentUserEmail = user.email;
    currentUserDisplayName = user.displayName;
    getCachedTasksFunc = getTasks;
    getCachedAnimationsFunc = getAnims;
    _openModal = openModalFunc;
    _closeModal = closeModalFunc;
    _animateCardEntry = animateCardEntryFunc; // Stocker la fonction d'animation

    // Attacher les listeners spécifiques à cette page
    if (addDocumentBtn) { addDocumentBtn.addEventListener('click', handleAddDocumentClick); } else { console.warn("Bouton #add-document-btn non trouvé"); }
    if (documentForm) { documentForm.addEventListener('submit', handleDocumentFormSubmit); } else { console.warn("Formulaire #document-form non trouvé"); }
    if (documentTypeSelect) { documentTypeSelect.addEventListener('change', toggleLinkingSection); } else { console.warn("#document-type select non trouvé"); }
    if (docFilterBtn) { docFilterBtn.addEventListener('click', () => renderDocuments()); } else { console.warn("#doc-filter-btn non trouvé"); }
    if (docSearchInput) { docSearchInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') renderDocuments(); }); } else { console.warn("#doc-search non trouvé"); }
    if (docTypeFilterSelect) { docTypeFilterSelect.addEventListener('change', () => renderDocuments()); } else { console.warn("#doc-type-filter non trouvé"); }

    // --- Listeners pour Imgur ---
    if (imgurUploadBtn && imgurUploadInput) {
        imgurUploadBtn.addEventListener('click', () => {
             if (!IMGUR_CLIENT_ID || IMGUR_CLIENT_ID === "METTRE_VOTRE_CLIENT_ID_IMGUR_ICI") { alert("Erreur: Le Client-ID Imgur n'est pas configuré."); return; }
            imgurUploadInput.click();
        });
        imgurUploadInput.addEventListener('change', handleImgurUpload);
    } else { console.warn("Bouton ou input pour l'upload Imgur non trouvé."); }
    // --- FIN Listeners Imgur ---

    // Charger et afficher les documents initiaux
    renderDocuments();
}

/**
 * Affiche/cache la section pour lier un document à une tâche/animation
 */
function toggleLinkingSection() {
    const selectedType = documentTypeSelect?.value;
    if (!documentLinkingSection || !documentLinkedItemSelect || !documentLinkLabel) return;
    if (selectedType === 'facture') { documentLinkLabel.textContent = "Lier à la Tâche :"; populateLinkedItemDropdowns('task'); documentLinkingSection.style.display = 'block'; }
    else if (selectedType === 'affiche') { documentLinkLabel.textContent = "Lier à l'Animation :"; populateLinkedItemDropdowns('animation'); documentLinkingSection.style.display = 'block'; }
    else { documentLinkingSection.style.display = 'none'; documentLinkedItemSelect.innerHTML = '<option value="">-- Ne pas lier --</option>'; }
}

/**
 * Remplit le dropdown de liaison (Tâches ou Animations)
 */
async function populateLinkedItemDropdowns(itemType) {
    if (!documentLinkedItemSelect) return;
    documentLinkedItemSelect.innerHTML = '<option value="">Chargement...</option>';
    let items = []; let optionsHtml = '<option value="">-- Ne pas lier --</option>';
    try { if (itemType === 'task' && typeof getCachedTasksFunc === 'function') { items = await getCachedTasksFunc(); items.sort((a, b) => (a.description || '').localeCompare(b.description || '')); items.forEach(item => { optionsHtml += `<option value="${item.id}">${item.description || `Tâche ID: ${item.id.substring(0, 5)}...`}</option>`; }); } else if (itemType === 'animation' && typeof getCachedAnimationsFunc === 'function') { items = await getCachedAnimationsFunc(); items.sort((a, b) => (a.title || '').localeCompare(b.title || '')); items.forEach(item => { optionsHtml += `<option value="${item.id}">${item.title || `Animation ID: ${item.id.substring(0, 5)}...`}</option>`; }); } else { console.warn("Type inconnu ou fonctions cache non fournies:", itemType); optionsHtml = '<option value="">Erreur chargement</option>'; } } catch (error) { console.error(`Erreur chargement ${itemType}s:`, error); optionsHtml = '<option value="">Erreur chargement</option>'; }
    documentLinkedItemSelect.innerHTML = optionsHtml;
}

/**
 * Récupère et affiche les documents depuis Firestore, en appliquant les filtres
 */
async function renderDocuments() {
    if (!documentListDiv) { console.error("DOM Error: #document-list non trouvé."); return; }
    if (!dbDocuments) { console.error("Référence DB 'documents' non initialisée."); return; }

    documentListDiv.innerHTML = '<p>Chargement des documents...</p>';
    const filterType = docTypeFilterSelect?.value || 'all';
    const searchTerm = docSearchInput?.value.trim().toLowerCase() || '';

    try {
        let query = dbDocuments.orderBy('uploadDate', 'desc');
        if (filterType !== 'all') { query = query.where('type', '==', filterType); }
        const snapshot = await query.get();
        let documents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (searchTerm) { documents = documents.filter(doc => (doc.title?.toLowerCase().includes(searchTerm)) || (doc.description?.toLowerCase().includes(searchTerm)) || (doc.linkedToTitle?.toLowerCase().includes(searchTerm)) ); }

        if (documents.length === 0) { documentListDiv.innerHTML = '<p>Aucun document trouvé correspondant aux critères.</p>'; return; }

        documentListDiv.innerHTML = '';
        documents.forEach((doc, index) => {
            const card = createDocumentCard(doc);
            documentListDiv.appendChild(card);
            // Utilisation de la fonction d'animation passée
            if (typeof _animateCardEntry === 'function') {
                 _animateCardEntry(card, index * 50);
            } else {
                 card.classList.remove('card-hidden'); // Fallback
                 console.warn("Fonction _animateCardEntry non disponible.");
            }
        });

    } catch (error) { console.error("Erreur récupération/affichage documents:", error); documentListDiv.innerHTML = `<p class="error-message">Erreur chargement documents: ${error.message}</p>`; }
}

/**
 * Crée l'élément HTML (carte) pour un document
 */
function createDocumentCard(doc) {
    const div = document.createElement('div');
    div.className = 'document-card card-hidden'; // Utilise les styles .document-card définis dans CSS
    div.setAttribute('data-id', doc.id);

    // --- Logique Miniature (Réintégrée) ---
    let thumbnailUrl = null;
    let isDirectImageLink = false; // Pour savoir si le lien principal est une image directe
    const imageTypes = ['affiche']; // Types considérés comme images
    const isImageType = imageTypes.includes(doc.type);
    let placeholderIconClass = 'fa-file'; // Icône par défaut

    if (isImageType && doc.url) {
        try {
            const urlObj = new URL(doc.url);
            if (urlObj.hostname === 'i.imgur.com') {
                // Tenter de générer une miniature Imgur
                const parts = doc.url.split('.');
                if (parts.length > 1) {
                    const extension = parts.pop();
                    const base = parts.join('.');
                    if (!base.endsWith('s')) { thumbnailUrl = `${base}s.${extension}`; }
                    else { thumbnailUrl = doc.url; } // Déjà une miniature ?
                    isDirectImageLink = true; // Les liens Imgur sont directs
                }
            } else if (/\.(jpg|jpeg|png|gif|webp|avif)$/i.test(doc.url)) {
                // Utiliser l'URL originale comme miniature pour les autres liens d'images directs
                thumbnailUrl = doc.url;
                isDirectImageLink = true;
            }
        } catch (e) { /* URL invalide, pas de miniature */ }
    }

    // Définir l'icône placeholder si pas de miniature image
    if (doc.type === 'facture') placeholderIconClass = 'fa-file-invoice-dollar';
    else if (doc.type === 'affiche' && !thumbnailUrl) placeholderIconClass = 'fa-file-image'; // Fallback
    else if (doc.type === 'compte-rendu') placeholderIconClass = 'fa-file-lines';
    else if (!thumbnailUrl) placeholderIconClass = 'fa-file-alt'; // Icône par défaut si pas d'image

    // --- FIN Logique Miniature ---


    // Icône pour le titre (peut être différente du placeholder)
    let titleIcon = 'fa-file-alt';
    if (doc.type === 'facture') titleIcon = 'fa-file-invoice-dollar';
    else if (doc.type === 'affiche') titleIcon = 'fa-file-image';
    else if (doc.type === 'compte-rendu') titleIcon = 'fa-file-lines';

    const uploadDate = doc.uploadDate?.toDate ? doc.uploadDate.toDate().toLocaleDateString('fr-FR', { year:'numeric', month:'short', day:'numeric'}) : 'N/A';
    const description = doc.description || '';

    // Info de liaison
    let linkedInfoHtml = '';
    if (doc.linkedToType === 'task' || doc.linkedToType === 'animation') {
        const linkIcon = doc.linkedToType === 'task' ? 'fa-tasks' : 'fa-calendar-alt';
        const linkedTitle = doc.linkedToTitle || `ID: ${doc.linkedToId?.substring(0,5)}...` || 'Élément inconnu';
        linkedInfoHtml = `<div class="card-detail"><i class="fas ${linkIcon} fa-fw"></i><span title="Lié à: ${linkedTitle}">Lié à: ${linkedTitle}</span></div>`;
    }

    // Description
    const descriptionHtml = description ? `<div class="card-detail"><i class="fas fa-info-circle fa-fw"></i><span title="${description}">${description}</span></div>` : '';

    // Placeholder image en cas d'erreur chargement
    const placeholderOnError = "this.onerror=null; this.parentElement.innerHTML = `<i class='fas fa-exclamation-triangle fa-2x text-muted' title='Erreur chargement image'></i>`;";


    // --- Structure HTML avec Flexbox ET Miniature ---
    div.innerHTML = `
        <div class="card-body doc-card-body-with-thumb"> <!-- Classe spécifique pour gérer flex avec miniature -->
            <div class="doc-thumbnail">
                ${thumbnailUrl
                    ? `<img src="${thumbnailUrl}" alt="Aperçu" loading="lazy" onerror="${placeholderOnError}">`
                    : `<i class="fas ${placeholderIconClass} fa-3x"></i>`
                }
            </div>
            <div class="doc-info">
                <h3 class="doc-title"><i class="fas ${titleIcon} fa-fw"></i> ${doc.title || 'Sans titre'}</h3>
                <div class="card-detail"> <!-- On remet les détails ici -->
                   <i class="fas fa-calendar-plus fa-fw"></i>
                   <span>Ajouté le: ${uploadDate}</span>
                </div>
                ${linkedInfoHtml}
                ${descriptionHtml}
            </div>
        </div>
        <div class="card-footer">
             <!-- Le bouton Ouvrir est spécifique -->
             <a href="${doc.url}" target="_blank" rel="noopener noreferrer" class="btn primary-btn btn-small" title="${isDirectImageLink ? 'Ouvrir l\'image directement' : 'Ouvrir le document'}">
                <i class="fas fa-external-link-alt"></i> Ouvrir
             </a>
            <button class="btn secondary-btn edit-btn btn-small" title="Modifier les détails"><i class="fas fa-edit"></i></button>
            <button class="btn danger-btn delete-btn btn-small" title="Supprimer"><i class="fas fa-trash"></i></button>
        </div>
    `;

    // Listeners (inchangé)
    div.querySelector('.edit-btn')?.addEventListener('click', () => handleEditDocumentClick(doc.id));
    div.querySelector('.delete-btn')?.addEventListener('click', () => handleDeleteDocumentClick(doc.id, doc.title));

    return div;
}

/**
 * Ouvre la modale pour ajouter un nouveau document
 */
function handleAddDocumentClick() {
    if (!currentUserEmail) { alert("Veuillez vous connecter."); return; }
    editingDocumentId = null;
    if (documentForm) documentForm.reset();
    if (documentFormTitle) documentFormTitle.textContent = "Ajouter un Document";
    if (hiddenDocumentIdInput) hiddenDocumentIdInput.value = '';
    if (imgurStatusSpan) imgurStatusSpan.textContent = ''; // Vider statut Imgur
    toggleLinkingSection();
    if (documentModal && typeof _openModal === 'function') { _openModal(documentModal); }
    else { console.error("Impossible d'ouvrir modale doc."); }
}

/**
 * Ouvre la modale pour modifier un document existant
 */
async function handleEditDocumentClick(docId) {
    if (!currentUserEmail) { alert("Veuillez vous connecter."); return; }
    editingDocumentId = docId;
    try { const docRef = dbDocuments.doc(docId); const docSnap = await docRef.get(); if (docSnap.exists) { const data = docSnap.data(); if (documentFormTitle) documentFormTitle.textContent = "Modifier le Document"; if (hiddenDocumentIdInput) hiddenDocumentIdInput.value = docId; if (document.getElementById('document-title')) document.getElementById('document-title').value = data.title || ''; if (document.getElementById('document-url')) document.getElementById('document-url').value = data.url || ''; if (document.getElementById('document-type')) document.getElementById('document-type').value = data.type || ''; if (document.getElementById('document-description')) document.getElementById('document-description').value = data.description || ''; if (imgurStatusSpan) imgurStatusSpan.textContent = ''; toggleLinkingSection(); if (data.linkedToType === 'task' || data.linkedToType === 'animation') { await populateLinkedItemDropdowns(data.linkedToType); if (documentLinkedItemSelect) { setTimeout(() => { if (documentLinkedItemSelect) documentLinkedItemSelect.value = data.linkedToId || ''; }, 100); } } if (documentModal && typeof _openModal === 'function') { _openModal(documentModal); } else { console.error("Impossible d'ouvrir modale doc pour édition."); } } else { alert("Document introuvable."); editingDocumentId = null; } } catch (error) { console.error("Erreur récup doc pour édition:", error); alert("Erreur récupération document."); editingDocumentId = null; }
}

/**
 * Gère la soumission du formulaire d'ajout/modification
 */
async function handleDocumentFormSubmit(e) {
    e.preventDefault();
    if (!currentUserEmail) { alert("Veuillez vous connecter."); return; }
    const title = document.getElementById('document-title')?.value.trim(); const url = document.getElementById('document-url')?.value.trim(); const type = document.getElementById('document-type')?.value; const description = document.getElementById('document-description')?.value.trim(); const linkedItemId = documentLinkedItemSelect?.value || '';
    if (!title || !url || !type) { alert("Titre, URL et Type requis."); return; } try { new URL(url); } catch (_) { alert("URL invalide (doit commencer par http:// ou https://)."); return; }
    let linkedToType = null; let linkedToTitle = null; if (linkedItemId) { if (type === 'facture') { linkedToType = 'task'; try { const tasks = await getCachedTasksFunc(); const linkedTask = tasks.find(t => t.id === linkedItemId); linkedToTitle = linkedTask?.description || null; } catch (err) { console.error("Err récup titre tâche", err); } } else if (type === 'affiche') { linkedToType = 'animation'; try { const anims = await getCachedAnimationsFunc(); const linkedAnim = anims.find(a => a.id === linkedItemId); linkedToTitle = linkedAnim?.title || null; } catch (err) { console.error("Err récup titre anim", err); } } } else { linkedToType = 'none'; }
    const data = { title, url, type, description, linkedToType, linkedToId: linkedItemId || null, linkedToTitle: linkedToTitle || null, }; const btn = documentForm?.querySelector('button[type="submit"]'); if (btn) { btn.disabled = true; btn.textContent = '...'; }
    try { if (editingDocumentId) { await dbDocuments.doc(editingDocumentId).update(data); alert('Document mis à jour !'); } else { data.uploadDate = firebase.firestore.FieldValue.serverTimestamp(); data.uploaderEmail = currentUserEmail; data.uploaderName = currentUserDisplayName || currentUserEmail; await dbDocuments.add(data); alert('Document ajouté !'); } if (documentModal && typeof _closeModal === 'function') { _closeModal(documentModal); } renderDocuments();
    } catch (error) { console.error("Err save doc:", error); alert("Erreur enregistrement.");
    } finally { if (btn) { btn.disabled = false; btn.textContent = 'Enregistrer'; } }
}

/**
 * Gère la suppression d'un document
 */
async function handleDeleteDocumentClick(docId, docTitle) {
    if (!currentUserEmail) { alert("Veuillez vous connecter."); return; } const titleConfirm = docTitle || `le document ID: ${docId}`; if (confirm(`Êtes-vous sûr de vouloir supprimer "${titleConfirm}" ?`)) { try { await dbDocuments.doc(docId).delete(); alert("Document supprimé."); renderDocuments(); } catch (error) { console.error("Erreur suppression document:", error); alert("Erreur suppression document."); } }
}

/**
 * Gère le choix d'un fichier et lance l'upload vers Imgur
 */
async function handleImgurUpload(event) {
    if (!imgurUploadBtn || !imgurStatusSpan || !documentUrlInput) return;
    const file = event.target.files ? event.target.files[0] : null;
    if (!file) { if (imgurStatusSpan) imgurStatusSpan.textContent = ""; return; }
    if (!file.type.startsWith('image/')) { alert("Veuillez sélectionner un fichier image."); if (imgurStatusSpan) imgurStatusSpan.textContent = "Fichier non image."; event.target.value = null; return; }

    console.log("Préparation upload Imgur:", file.name);
    imgurStatusSpan.textContent = "Téléversement..."; imgurStatusSpan.style.color = "var(--info-color)"; imgurUploadBtn.disabled = true;
    const formData = new FormData(); formData.append('image', file);

    try {
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: { Authorization: `Client-ID ${IMGUR_CLIENT_ID}`, },
            body: formData,
        });
        event.target.value = null; // Reset input file
        if (!response.ok) { let errorMsg = `Erreur ${response.status}: ${response.statusText}`; try { const errorData = await response.json(); errorMsg = errorData?.data?.error || errorMsg; } catch (e) {} throw new Error(errorMsg); }
        const data = await response.json();
        if (data.success && data.data?.link) { console.log('Upload Imgur OK:', data.data.link); imgurStatusSpan.textContent = "Succès !"; imgurStatusSpan.style.color = "var(--success-color)"; documentUrlInput.value = data.data.link; if (documentTypeSelect && documentTypeSelect.value === "") { documentTypeSelect.value = "affiche"; toggleLinkingSection(); }
        } else { console.error("Réponse Imgur invalide:", data); throw new Error(data.data?.error || "Réponse Imgur invalide."); }
    } catch (error) { console.error("Erreur upload Imgur:", error); imgurStatusSpan.textContent = `Erreur: ${error.message}`; imgurStatusSpan.style.color = "var(--danger-color)";
    } finally { imgurUploadBtn.disabled = false; setTimeout(() => { if (imgurStatusSpan) imgurStatusSpan.textContent = ""; }, 5000); }
}

// --- FIN DU FICHIER documents.js ---
