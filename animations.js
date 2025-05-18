// animations.js
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    Timestamp,
    query,
    where,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { openModal as commonOpenModal, closeModal as commonCloseModal } from './script.js';
// Import des fonctions de task.js nécessaires pour le modal des tâches
import { loadTasksForAnimation, displayTasks as displayTasksInModal } from './task.js';

let dbInstance = null;
const IMGUR_CLIENT_ID = 'd6129b56d060c8f'; // Votre Client ID Imgur

export function initializeAnimationsModule(firestoreInstance) {
    dbInstance = firestoreInstance;
    // console.log("Animations module initialized with Firestore instance.");
}

const animationsGridContainer = () => document.getElementById('animationsGridContainer');
const animationModalElement = () => document.getElementById('addAnimationModal');


async function handleShowAnimationTasks(animationId, animationTitle) {
    // console.log(`Showing tasks for animation ID: ${animationId}, Title: ${animationTitle}`);
    const modalElement = commonOpenModal('animationTasksModal', 'animationTasksModalTemplate');
    if (!modalElement) { console.error("Failed to open animation tasks modal."); return; }

    const modalTitleElement = modalElement.querySelector('#modalAnimationTitle');
    if (modalTitleElement) modalTitleElement.textContent = animationTitle;

    const tasksListContainer = modalElement.querySelector('#modalAnimationTasksListContainer');
    if (!tasksListContainer) {
        console.error("Tasks list container in modal not found.");
        commonCloseModal('animationTasksModal');
        return;
    }
    tasksListContainer.innerHTML = '<p>Chargement des tâches...</p>';

    try {
        const tasks = await loadTasksForAnimation(animationId); // Fonction de task.js
        if (tasks && tasks.length > 0) {
            await displayTasksInModal(tasks, tasksListContainer); // Utilise la fonction de task.js (peut-être via alias)
        } else {
            tasksListContainer.innerHTML = '<p>Aucune tâche associée à cette animation.</p>';
        }
    } catch (error) {
        console.error(`Error fetching or displaying tasks for animation ${animationId}:`, error);
        tasksListContainer.innerHTML = '<p class="error-message">Erreur lors du chargement des tâches.</p>';
    }
}

async function getTasksBudgetForAnimation(animationId) {
    if (!dbInstance || !animationId) return 0;
    let totalBudget = 0;
    try {
        const tasksCol = collection(dbInstance, "tasks");
        const q = query(tasksCol, where("animationId", "==", animationId));
        const tasksSnapshot = await getDocs(q);
        tasksSnapshot.forEach(docSnap => {
            totalBudget += parseFloat(docSnap.data().budget) || 0;
        });
    } catch (error) {
        console.error(`Error fetching tasks budget for animation ${animationId}:`, error);
    }
    return totalBudget;
}

export async function loadAnimations() {
    // console.log("loadAnimations: Called");
    if (!dbInstance) { console.error("Animations module: Firestore instance not initialized."); return []; }
    const gridContainer = animationsGridContainer();
    if (!gridContainer) { console.warn("Animations module: Grid container not found."); return []; }
    gridContainer.innerHTML = '<p>Chargement des animations...</p>';

    try {
        const animationsCol = collection(dbInstance, "animations");
        // Pourrait ajouter orderBy ici si nécessaire, par exemple orderBy("dateTime", "desc")
        const q = query(animationsCol, orderBy("dateTime", "desc"));
        const animationSnapshot = await getDocs(q);
        const animationListPromises = [];

        animationSnapshot.docs.forEach(docSnap => {
            const animationData = docSnap.data();
            const animationId = docSnap.id;
            const animationDetailPromise = async () => {
                const participantNames = await getParticipantNames(animationData.participantIds || []);
                const tasksBudget = await getTasksBudgetForAnimation(animationId);
                return { id: animationId, ...animationData, participantNames, tasksBudget };
            };
            animationListPromises.push(animationDetailPromise());
        });

        const animationList = await Promise.all(animationListPromises);
        displayAnimations(animationList);
        // L'événement 'animationsUpdated' est plus générique et est déjà géré par script.js
        // pour mettre à jour allRawAnimationsDataGlobal.
        // document.dispatchEvent(new CustomEvent('animationsUpdated')); // Déjà fait par script.js après cet appel
        return animationList;
    } catch (error) {
        console.error("Error loading animations:", error);
        if (gridContainer) gridContainer.innerHTML = '<p class="error-message">Erreur chargement animations.</p>';
        return [];
    }
}

async function getParticipantNames(participantIds) {
    if (!dbInstance || !participantIds || participantIds.length === 0) return [];
    const names = [];
    for (const memberId of participantIds) {
        try {
            const memberRef = doc(dbInstance, "members", memberId);
            const memberSnap = await getDoc(memberRef);
            if (memberSnap.exists()) {
                const memberData = memberSnap.data();
                names.push(`${memberData.firstname || ''} ${memberData.lastname || ''}`.trim() || "Nom inconnu");
            } else { names.push("Membre Supprimé"); }
        } catch (error) { console.error(`Error fetching member name for ID ${memberId}:`, error); names.push("Erreur Nom"); }
    }
    return names;
}

function displayAnimations(animations) {
    const gridContainer = animationsGridContainer();
    if (!gridContainer) return;
    gridContainer.innerHTML = '';
    if (animations.length === 0) { gridContainer.innerHTML = '<p>Aucune animation programmée.</p>'; return; }

    animations.forEach(anim => {
        const card = document.createElement('div');
        card.classList.add('animation-card');
        card.dataset.id = anim.id;
        let dateDisplay = "Date non spécifiée";
        if (anim.dateTime && typeof anim.dateTime.toDate === 'function') { try { dateDisplay = anim.dateTime.toDate().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' }); } catch (e) { console.error("Erreur format date:", anim.title, e); }}
        let membersAvatarsHTML = '';
        if (anim.participantNames && anim.participantNames.length > 0) {
            const maxAvatarsToShow = 2;
            anim.participantNames.slice(0, maxAvatarsToShow).forEach(name => { const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || '?'; membersAvatarsHTML += `<div class="member-avatar" title="${name}">${initials}</div>`; });
            if (anim.participantNames.length > maxAvatarsToShow) membersAvatarsHTML += `<div class="member-avatar">+${anim.participantNames.length - maxAvatarsToShow}</div>`;
        } else { membersAvatarsHTML = '<span class="text-muted" style="font-size:0.8em;">Aucun responsable</span>'; }
        let documentButtonHTML = '';
        if (anim.documentUrl) { try { new URL(anim.documentUrl); documentButtonHTML = `<a href="${anim.documentUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline btn-document" style="margin-top: 10px; display: inline-flex; align-items: center;"><i data-feather="file-text" style="margin-right: 5px;"></i> Voir Document</a>`; } catch (e) { documentButtonHTML = `<span class="text-muted" style="font-size:0.8em; margin-top:10px; display:block;">Lien doc. invalide</span>`; }}

        card.innerHTML = `
            <div class="animation-poster" style="background-image: url('${anim.afficheUrl || ''}'); background-color: ${anim.afficheUrl ? 'transparent' : 'var(--sage)'};">
                ${!anim.afficheUrl ? '<i data-feather="image" style="width:48px; height:48px; color: rgba(255,255,255,0.7);"></i>' : ''}
                <div class="animation-date">${dateDisplay}</div>
            </div>
            <div class="animation-content">
                <h3 class="animation-title">${anim.title || 'Animation Sans Titre'}</h3>
                <div class="animation-meta">
                    <div class="animation-meta-item"><i data-feather="map-pin"></i> ${anim.location || 'N/A'}</div>
                    <div class="animation-meta-item"><i data-feather="tag"></i> ${anim.animationType || 'N/A'}</div>
                    <div class="animation-meta-item"><i data-feather="activity"></i> ${anim.status || 'N/A'}</div>
                    ${anim.description ? `<div class="animation-meta-item description" style="white-space: pre-wrap; word-break: break-word;"><i data-feather="align-left"></i> ${anim.description}</div>` : ''}
                    <div class="animation-meta-item"><i data-feather="dollar-sign"></i> Budget Tâches: <strong>${(anim.tasksBudget || 0).toFixed(2)}€</strong></div>
                </div>
                <div class="animation-members" title="${(anim.participantNames || []).join(', ')}">${membersAvatarsHTML}</div>
                ${documentButtonHTML}
                <div class="animation-actions">
                    <button class="btn btn-sm btn-icon btn-outline btn-show-tasks" title="Voir les tâches"><i data-feather="clipboard"></i></button>
                    <button class="btn btn-sm btn-outline btn-edit-animation"><i data-feather="edit-2"></i> Modifier</button>
                    <button class="btn btn-sm btn-outline btn-delete-animation" style="color: var(--danger); border-color: var(--danger);"><i data-feather="trash-2"></i> Supprimer</button>
                </div>
            </div>`;
        gridContainer.appendChild(card);
    });
    if (typeof feather !== 'undefined') feather.replace();
    attachAnimationActionListeners();
}

function attachAnimationActionListeners() {
    const container = animationsGridContainer(); if (!container) return;
    container.querySelectorAll('.btn-edit-animation').forEach(button => {
        const newButton = button.cloneNode(true); button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => { const card = e.target.closest('.animation-card'); if (card?.dataset.id) handleEditAnimation(card.dataset.id); });
    });
    container.querySelectorAll('.btn-delete-animation').forEach(button => {
        const newButton = button.cloneNode(true); button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => { const card = e.target.closest('.animation-card'); if (card?.dataset.id) handleDeleteAnimation(card.dataset.id); });
    });
    container.querySelectorAll('.btn-show-tasks').forEach(button => {
        const newButton = button.cloneNode(true); button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', async (e) => {
            const card = e.target.closest('.animation-card');
            const animationId = card?.dataset.id;
            const animationTitle = card?.querySelector('.animation-title')?.textContent || "Animation";
            if (animationId) await handleShowAnimationTasks(animationId, animationTitle);
        });
    });
}

async function uploadToImgur(imageFile) {
    if (!imageFile) return null;
    const formData = new FormData(); formData.append('image', imageFile);
    try {
        const response = await fetch('https://api.imgur.com/3/image', { method: 'POST', headers: { 'Authorization': `Client-ID ${IMGUR_CLIENT_ID}` }, body: formData });
        const data = await response.json();
        if (data.success) return data.data.link;
        else { console.error("Imgur upload failed:", data); alert(`Erreur Imgur: ${data.data.error?.message || 'Erreur inconnue'}`); return null; }
    } catch (error) { console.error("Imgur network error:", error); alert("Erreur réseau Imgur."); return null; }
}

async function handleSaveAnimation(event, animationIdToUpdate = null) {
    event.preventDefault();
    if (!dbInstance) { console.error("DB not available for saving animation."); return; }
    const modalElem = animationModalElement(); if (!modalElem) { console.error("Animation modal not found."); return; }
    const saveButton = modalElem.querySelector('#saveAnimationBtn'); const originalButtonText = saveButton.textContent;
    saveButton.textContent = 'Sauvegarde...'; saveButton.disabled = true;

    const title = modalElem.querySelector('#animationTitle').value.trim();
    const description = modalElem.querySelector('#animationDescription').value.trim();
    const dateStr = modalElem.querySelector('#animationDate').value;
    let afficheUrl = modalElem.querySelector('#animationPosterUrl').value.trim();
    const location = modalElem.querySelector('#animationLocation').value.trim();
    const animationType = modalElem.querySelector('#animationType').value;
    const participantIds = Array.from(modalElem.querySelector('#animationResponsibleMembers').selectedOptions).map(opt => opt.value);
    const imageFile = modalElem.querySelector('#animationImageUpload').files[0];
    const documentUrl = modalElem.querySelector('#animationDocumentUrl').value.trim();

    if (!title || !dateStr || !location || !animationType) { alert("Titre, Date, Lieu et Type sont obligatoires."); saveButton.textContent = originalButtonText; saveButton.disabled = false; return; }
    if (imageFile) { const uploadedUrl = await uploadToImgur(imageFile); if (uploadedUrl) afficheUrl = uploadedUrl; else { saveButton.textContent = originalButtonText; saveButton.disabled = false; return; } }
    let dateTimeStamp = null;
    if (dateStr) { try { const [y,m,d] = dateStr.split('-').map(Number); dateTimeStamp = Timestamp.fromDate(new Date(y, m - 1, d)); } catch (e) { alert("Date invalide."); saveButton.textContent = originalButtonText; saveButton.disabled = false; return; }}

    const animationData = { title, description, dateTime: dateTimeStamp, afficheUrl: afficheUrl || '', location, animationType, participantIds, documentUrl: documentUrl || '' };
    if (animationIdToUpdate) { try { const snap = await getDoc(doc(dbInstance, "animations", animationIdToUpdate)); animationData.status = snap.exists() ? (snap.data().status || "planifiée") : "planifiée"; } catch(e){ animationData.status = "planifiée";}}
    else animationData.status = "planifiée";

    try {
        if (animationIdToUpdate) await updateDoc(doc(dbInstance, "animations", animationIdToUpdate), animationData);
        else await addDoc(collection(dbInstance, "animations"), animationData);
        commonCloseModal('addAnimationModal');
        document.dispatchEvent(new CustomEvent('animationsUpdated'));
    } catch (error) { console.error("Error saving animation:", error); alert("Erreur sauvegarde animation.");
    } finally {
        saveButton.textContent = originalButtonText; saveButton.disabled = false;
        modalElem.querySelector('#animationImageUpload').value = '';
        const preview = modalElem.querySelector('#animationImagePreview'); if(preview){ preview.style.display = 'none'; preview.src = '#';}
        modalElem.querySelector('#animationDocumentUrl').value = '';
    }
}

async function handleEditAnimation(animationId) {
    if (!dbInstance || !animationId) return;
    const modalElem = commonOpenModal('addAnimationModal', 'animationModalTemplate'); if (!modalElem) return;
    modalElem.querySelector('.modal-title').textContent = 'Modifier l\'animation';
    const saveBtn = modalElem.querySelector('#saveAnimationBtn'); saveBtn.textContent = 'Modifier';
    modalElem.querySelector('#animationImageUpload').value = '';
    const preview = modalElem.querySelector('#animationImagePreview'); if(preview){preview.style.display='none'; preview.src='#';}

    try {
        const docSnap = await getDoc(doc(dbInstance, "animations", animationId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            modalElem.querySelector('#animationTitle').value = data.title || '';
            modalElem.querySelector('#animationDescription').value = data.description || '';
            if (data.dateTime?.toDate) { const d=data.dateTime.toDate(); modalElem.querySelector('#animationDate').value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; } else { modalElem.querySelector('#animationDate').value = ''; }
            modalElem.querySelector('#animationPosterUrl').value = data.afficheUrl || '';
            if (data.afficheUrl && preview) { preview.src = data.afficheUrl; preview.style.display = 'block'; }
            modalElem.querySelector('#animationLocation').value = data.location || '';
            modalElem.querySelector('#animationType').value = data.animationType || 'Événement';
            modalElem.querySelector('#animationDocumentUrl').value = data.documentUrl || '';
            const membersSelect = modalElem.querySelector('#animationResponsibleMembers'); await populateMembersForSelect(membersSelect);
            if (data.participantIds && Array.isArray(data.participantIds)) Array.from(membersSelect.options).forEach(opt => { opt.selected = data.participantIds.includes(opt.value);});
        } else { alert("Animation non trouvée."); commonCloseModal('addAnimationModal'); return; }
    } catch (error) { console.error("Error fetching animation for edit:", error); alert("Erreur récupération animation."); commonCloseModal('addAnimationModal'); return; }
    const newSaveBtn = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', (e) => handleSaveAnimation(e, animationId));
    modalElem.querySelector('#animationImageUpload').onchange = evt => {
        const [file] = evt.target.files;
        if (file && preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; modalElem.querySelector('#animationPosterUrl').value = '';}
        else if (preview) { preview.style.display = 'none'; preview.src = '#';}
    };
}

async function handleDeleteAnimation(animationId) {
    if (!dbInstance || !animationId || !confirm("Supprimer cette animation et ses tâches associées ?")) return;
    try {
        const tasksCol = collection(dbInstance, "tasks");
        const q = query(tasksCol, where("animationId", "==", animationId));
        const tasksSnapshot = await getDocs(q);
        const deletePromises = tasksSnapshot.docs.map(docSnap => deleteDoc(doc(dbInstance, "tasks", docSnap.id)));
        await Promise.all(deletePromises);
        await deleteDoc(doc(dbInstance, "animations", animationId));
        console.log("Animation and associated tasks deleted:", animationId);
        document.dispatchEvent(new CustomEvent('animationsUpdated'));
        document.dispatchEvent(new CustomEvent('tasksUpdated'));
    } catch (error) { console.error("Error deleting animation/tasks:", error); alert("Erreur suppression."); }
}

export async function setupAddAnimationModal() {
    const modalElem = animationModalElement(); if (!modalElem || !modalElem.classList.contains('active')) { console.warn("Add animation modal not active for setup."); return; }
    modalElem.querySelector('.modal-title').textContent = 'Nouvelle animation';
    const saveBtn = modalElem.querySelector('#saveAnimationBtn'); saveBtn.textContent = 'Enregistrer';
    ['#animationTitle', '#animationDescription', '#animationDate', '#animationPosterUrl', '#animationLocation', '#animationDocumentUrl'].forEach(sel => { const el = modalElem.querySelector(sel); if(el) el.value = '';});
    modalElem.querySelector('#animationType').value = 'Événement';
    modalElem.querySelector('#animationImageUpload').value = '';
    const preview = modalElem.querySelector('#animationImagePreview'); if(preview){preview.style.display='none'; preview.src='#';}
    const membersSelect = modalElem.querySelector('#animationResponsibleMembers'); await populateMembersForSelect(membersSelect);
    if(membersSelect) Array.from(membersSelect.options).forEach(opt => opt.selected = false);
    const newSaveBtn = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', (e) => handleSaveAnimation(e, null));
    modalElem.querySelector('#animationImageUpload').onchange = evt => {
        const [file] = evt.target.files;
        if (file && preview) { preview.src = URL.createObjectURL(file); preview.style.display = 'block'; modalElem.querySelector('#animationPosterUrl').value = '';}
        else if (preview) { preview.style.display = 'none'; preview.src = '#';}
    };
}

async function populateMembersForSelect(selectElement) {
    if (!selectElement || !dbInstance) { if(selectElement) selectElement.innerHTML = '<option value="" disabled>Erreur</option>'; return; }
    const current = Array.from(selectElement.selectedOptions).map(o=>o.value); selectElement.innerHTML = '<option value="" disabled>Chargement...</option>';
    try {
        const snap = await getDocs(query(collection(dbInstance, "members"), orderBy("firstname"), orderBy("lastname")));
        selectElement.innerHTML = '';
        if (snap.empty) selectElement.innerHTML = '<option value="" disabled>Aucun membre</option>';
        else snap.docs.forEach(d => { const m={id:d.id,...d.data()},o=document.createElement('option');o.value=m.id;o.textContent=(`${m.firstname||''} ${m.lastname||''}`.trim())||"Sans nom";if(current.includes(m.id))o.selected=true;selectElement.appendChild(o);});
    } catch (e) { console.error("Error populating members select:", e); selectElement.innerHTML = '<option value="" disabled>Erreur chargement</option>'; }
}
