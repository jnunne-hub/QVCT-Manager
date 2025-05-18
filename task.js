// task.js
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    Timestamp,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { openModal as commonOpenModal, closeModal as commonCloseModal } from './script.js';

let dbInstance = null;
// Cache global pour les détails des membres pour éviter les requêtes répétées
const membersCache = {};

export function initializeTasksModule(firestoreInstance) {
    dbInstance = firestoreInstance;
    if (dbInstance) {
        // console.log("Tasks module initialized with Firestore instance. Project ID:", dbInstance.app.options.projectId);
    } else {
        console.error("Tasks module: Firestore instance IS NULL upon initialization!");
    }
}

const pageTasksListContainer = () => document.getElementById('allTasksListContainer');
const taskModalElement = () => document.getElementById('addTaskModal');

export async function getAllTasks() {
    // console.log("%cgetAllTasks: Function called", "color: blue; font-weight: bold;");
    if (!dbInstance) { console.error("getAllTasks: Firestore instance is NULL."); return []; }

    try {
        const tasksColRef = collection(dbInstance, "tasks");
        const q = query(tasksColRef, orderBy("createdAt", "desc"));
        const taskSnapshot = await getDocs(q);
        const tasks = [];
        taskSnapshot.forEach(docSnap => tasks.push({ id: docSnap.id, ...docSnap.data() }));
        // console.log(`getAllTasks: Mapped ${tasks.length} tasks.`);
        return tasks;
    } catch (error) {
        console.error("getAllTasks: Error:", error);
        if (error.code === 'failed-precondition') alert(`Erreur Firestore (tasks): Index manquant pour le tri sur 'createdAt'.`);
        else alert("Erreur récupération de toutes les tâches.");
        return [];
    }
}

export async function loadTasksForPage(filters = {}) {
    // console.log("%cloadTasksForPage: Called", "color: blue; font-weight: bold;", "Filters:", JSON.stringify(filters));
    if (!dbInstance) { console.error("loadTasksForPage: Firestore instance is NULL."); return; }
    const container = pageTasksListContainer();
    if (!container) { console.warn("loadTasksForPage: Container #allTasksListContainer not found."); return; }
    container.innerHTML = '<p>Chargement des tâches...</p>';

    try {
        let taskList = [];
        const hasActiveFilters = Object.values(filters).some(f => f !== "" && f !== null && f !== undefined && (Array.isArray(f) ? f.length > 0 : true));
        const tasksColRef = collection(dbInstance, "tasks");
        let q;

        if (hasActiveFilters) {
            let qConstraints = [];
            if (filters.status) qConstraints.push(where("status", "==", filters.status));
            if (filters.animationId) qConstraints.push(where("animationId", "==", filters.animationId));
            if (filters.assigneeId) qConstraints.push(where("assigneeIds", "array-contains", filters.assigneeId));
            qConstraints.push(orderBy("createdAt", "desc"));
            q = query(tasksColRef, ...qConstraints);
        } else {
            q = query(tasksColRef, orderBy("createdAt", "desc")); // Si pas de filtre, getAllTasks est plus simple mais refait une requête
            // Pour optimiser, si script.js a déjà allRawTasksDataGlobal, on pourrait filtrer ça.
            // Mais pour l'instant, on refait une requête pour la simplicité de la logique ici.
        }
        
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => taskList.push({ id: docSnap.id, ...docSnap.data() }));
        await displayTasks(taskList, container);
    } catch (error) {
        console.error("loadTasksForPage: Error:", error);
        if (container) container.innerHTML = `<p class="error-message">Erreur chargement tâches: ${error.message}.</p>`;
    }
}

export async function loadTasksForAnimation(animationId) { // EXPORTÉE pour animations.js
    // console.log(`%cloadTasksForAnimation: Called for animationId: ${animationId}`, "color: blueviolet; font-weight: bold;");
    if (!dbInstance) { console.error("loadTasksForAnimation: Firestore instance is NULL."); return []; }
    if (!animationId) { console.warn("loadTasksForAnimation: animationId is undefined or empty."); return []; }

    try {
        const tasksColRef = collection(dbInstance, "tasks");
        const q = query(tasksColRef, where("animationId", "==", animationId), orderBy("createdAt", "desc"));
        const tasksSnapshot = await getDocs(q);
        const tasks = [];
        tasksSnapshot.forEach(docSnap => tasks.push({ id: docSnap.id, ...docSnap.data() }));
        // console.log(`loadTasksForAnimation: Found ${tasks.length} tasks for animationId '${animationId}'.`);
        return tasks;
    } catch (error) {
        console.error(`loadTasksForAnimation: Error for animationId '${animationId}':`, error);
        if (error.code === 'failed-precondition') alert(`Erreur Firestore: Index manquant pour les tâches d'animation.`);
        return [];
    }
}

async function getAssigneeDetails(assigneeIds) {
    if (!dbInstance || !assigneeIds || assigneeIds.length === 0) return [];
    const uniqueAssigneeIds = [...new Set(assigneeIds.filter(id => id))]; // Filtrer les IDs vides/nuls avant Set
    const detailsToReturn = [];
    const idsToFetchFromDB = uniqueAssigneeIds.filter(id => !membersCache[id]);

    if (idsToFetchFromDB.length > 0) {
        // console.log("getAssigneeDetails: Fetching from DB for member IDs:", idsToFetchFromDB);
        const memberPromises = idsToFetchFromDB.map(memberId =>
            getDoc(doc(dbInstance, "members", memberId)).then(memberSnap => {
                if (memberSnap.exists()) {
                    const memberData = memberSnap.data();
                    membersCache[memberId] = {
                        id: memberId,
                        name: `${memberData.firstname || ''} ${memberData.lastname || ''}`.trim() || "Membre Anonyme",
                        initials: `${memberData.firstname ? memberData.firstname[0] : ''}${memberData.lastname ? memberData.lastname[0] : ''}`.toUpperCase() || '??',
                        avatarUrl: memberData.avatarUrl || null
                    };
                } else {
                    membersCache[memberId] = { id: memberId, name: "Membre Supprimé", initials: "XX", avatarUrl: null };
                }
            }).catch(error => {
                console.error(`Error fetching member details for ID ${memberId}:`, error);
                membersCache[memberId] = { id: memberId, name: "Erreur Membre", initials: "EE", avatarUrl: null };
            })
        );
        await Promise.all(memberPromises);
    }
    assigneeIds.forEach(id => { if (id && membersCache[id]) detailsToReturn.push(membersCache[id]); });
    return detailsToReturn;
}

export async function displayTasks(tasks, containerElement) { // EXPORTÉE pour animations.js (via alias)
    // console.log("%cdisplayTasks: Function called", "color: green; font-weight: bold;", "Tasks count:", tasks ? tasks.length : 0);
    if (!containerElement) { console.warn("displayTasks: No container element."); return; }
    containerElement.innerHTML = '';
    if (!tasks || tasks.length === 0) { containerElement.innerHTML = '<p>Aucune tâche à afficher.</p>'; return; }

    const animationTitlesCache = {};
    const animIdsToFetchForTitles = [...new Set(tasks.map(t => t.animationId).filter(id => id && dbInstance))];
    if (animIdsToFetchForTitles.length > 0) {
        const animPromises = animIdsToFetchForTitles.map(animId =>
            getDoc(doc(dbInstance, "animations", animId)).then(animDoc => {
                animationTitlesCache[animId] = animDoc.exists() ? (animDoc.data().title || "Anim. sans titre") : "Anim. Supprimée";
            }).catch(() => animationTitlesCache[animId] = "Erreur Anim.")
        );
        await Promise.all(animPromises);
    }

    const allUniqueAssigneeIdsInView = new Set();
    tasks.forEach(task => {
        if (task.assigneeIds && Array.isArray(task.assigneeIds)) {
            task.assigneeIds.forEach(id => { if (id) allUniqueAssigneeIdsInView.add(id); });
        }
    });
    if (allUniqueAssigneeIdsInView.size > 0) {
        await getAssigneeDetails(Array.from(allUniqueAssigneeIdsInView));
    }

    tasks.forEach((task) => {
        const card = document.createElement('div');
        card.classList.add('task-card', task.status || 'todo');
        card.dataset.id = task.id;
        let dueDateDisplay = "Pas d'échéance";
        if (task.dueDate && typeof task.dueDate.toDate === 'function') { try { dueDateDisplay = task.dueDate.toDate().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { dueDateDisplay = "Date invalide";}}
        else if (task.dueDate) { try { const d = new Date(task.dueDate); if(!isNaN(d.getTime())) dueDateDisplay = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }); else dueDateDisplay = String(task.dueDate).substring(0,10);} catch(e){dueDateDisplay = "Date erronée";}}
        const animationTitle = task.animationId ? (animationTitlesCache[task.animationId] || "...") : "Non liée";
        let statusIcon = "circle"; let statusText = "À faire"; let taskEffectiveStatus = task.status || 'todo';
        switch (taskEffectiveStatus) { case "pending": statusIcon = "clock"; statusText = "En cours"; break; case "completed": statusIcon = "check-circle"; statusText = "Terminé"; break; }

        let assigneesHTML = '<span class="text-muted" style="font-size:0.8em;">Non assignée</span>';
        if (task.assigneeIds && Array.isArray(task.assigneeIds) && task.assigneeIds.length > 0) {
            const assigneeDetails = task.assigneeIds.map(id => membersCache[id]).filter(Boolean);
            if (assigneeDetails.length > 0) {
                let tempHTML = ''; const maxAvatarsToShow = 3;
                assigneeDetails.slice(0, maxAvatarsToShow).forEach(assignee => {
                    if (assignee.avatarUrl) tempHTML += `<img src="${assignee.avatarUrl}" alt="${assignee.name}" class="member-avatar-task" title="${assignee.name}">`;
                    else tempHTML += `<div class="member-avatar-task initials" title="${assignee.name}">${assignee.initials}</div>`;
                });
                if (assigneeDetails.length > maxAvatarsToShow) tempHTML += `<div class="member-avatar-task more-assignees">+${assigneeDetails.length - maxAvatarsToShow}</div>`;
                assigneesHTML = `<div class="task-assignees-container" title="Assigné à : ${assigneeDetails.map(a => a.name).join(', ')}">${tempHTML}</div>`;
            }
        }
        card.innerHTML = `
            <div class="task-status ${taskEffectiveStatus}"><i data-feather="${statusIcon}"></i></div>
            <div class="task-content">
                <div class="task-title">${task.title || task.description || 'Tâche sans titre'}</div>
                <div class="task-meta">
                    <div class="task-meta-item"><i data-feather="calendar"></i> ${dueDateDisplay}</div>
                    <div class="task-meta-item"><i data-feather="link"></i> ${animationTitle}</div>
                    <div class="task-meta-item"><i data-feather="dollar-sign"></i> ${parseFloat(task.budget || 0).toFixed(2)}€</div>
                    <div class="task-meta-item"><i data-feather="info"></i> ${statusText}</div>
                </div>
                <div class="task-assignees">${assigneesHTML}</div>
            </div>
            <div class="task-actions">
                <button class="btn btn-icon btn-sm btn-outline btn-edit-task"><i data-feather="edit-2"></i></button>
                <button class="btn btn-icon btn-sm btn-outline btn-delete-task"><i data-feather="trash-2"></i></button>
            </div>`;
        containerElement.appendChild(card);
    });
    if (typeof feather !== 'undefined') feather.replace();
    attachTaskActionListeners(containerElement);
}

function attachTaskActionListeners(containerElement) {
    if (!containerElement) return;
    containerElement.querySelectorAll('.btn-edit-task').forEach(button => {
        const newButton = button.cloneNode(true); button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            const card = e.target.closest('.task-card'); if (card?.dataset.id) handleEditTask(card.dataset.id);
        });
    });
    containerElement.querySelectorAll('.btn-delete-task').forEach(button => {
        const newButton = button.cloneNode(true); button.parentNode.replaceChild(newButton, button);
        newButton.style.color = 'var(--danger)'; newButton.style.borderColor = 'var(--danger)';
        newButton.addEventListener('click', (e) => {
            const card = e.target.closest('.task-card'); if (card?.dataset.id) handleDeleteTask(card.dataset.id);
        });
    });
}

async function handleSaveTask(event, taskIdToUpdate = null) {
    event.preventDefault();
    if (!dbInstance) { console.error("handleSaveTask: DB instance is NULL."); return; }
    const modalElem = taskModalElement();
    if (!modalElem) { console.error("handleSaveTask: Task modal element not found."); return; }
    const saveButton = modalElem.querySelector('#saveTaskBtn');
    const originalButtonText = saveButton.textContent;
    saveButton.textContent = 'Sauvegarde...'; saveButton.disabled = true;
    const title = modalElem.querySelector('#taskTitle').value.trim();
    const description = modalElem.querySelector('#taskDescription').value.trim();
    const animationId = modalElem.querySelector('#taskAnimationLink').value;
    const assigneeIds = Array.from(modalElem.querySelector('#taskAssignedMembers').selectedOptions).map(opt => opt.value).filter(Boolean);
    const budget = parseFloat(modalElem.querySelector('#taskBudgetSpent').value) || 0;
    const status = modalElem.querySelector('#taskStatus').value;
    const dueDateStr = modalElem.querySelector('#taskDueDate').value;
    if (!title || !status) { alert("Titre et Statut sont requis."); saveButton.textContent = originalButtonText; saveButton.disabled = false; return; }
    let dueDateTimeStamp = null;
    if (dueDateStr) { try { const [year, month, day] = dueDateStr.split('-').map(Number); if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) throw new Error("Invalid date components"); const dateObj = new Date(Date.UTC(year, month - 1, day, 0, 0, 0)); if (isNaN(dateObj.getTime())) throw new Error("Invalid date object"); dueDateTimeStamp = Timestamp.fromDate(dateObj); } catch (e) { console.warn("Invalid due date format", e); alert("Format date échéance invalide.");}}
    const taskData = { title, description, animationId: animationId || null, assigneeIds, budget, status, dueDate: dueDateTimeStamp, updatedAt: serverTimestamp() };
    if (!taskIdToUpdate) taskData.createdAt = serverTimestamp();
    try {
        if (taskIdToUpdate) await updateDoc(doc(dbInstance, "tasks", taskIdToUpdate), taskData);
        else await addDoc(collection(dbInstance, "tasks"), taskData);
        commonCloseModal('addTaskModal');
        document.dispatchEvent(new CustomEvent('tasksUpdated'));
    } catch (error) { console.error("Error saving task:", error); alert("Erreur sauvegarde tâche.");
    } finally { saveButton.textContent = originalButtonText; saveButton.disabled = false; }
}

async function handleEditTask(taskId) {
    if (!dbInstance || !taskId) return;
    const modalElem = commonOpenModal('addTaskModal', 'taskModalTemplate');
    if (!modalElem) return;
    modalElem.querySelector('.modal-title').textContent = 'Modifier Tâche';
    const saveBtn = modalElem.querySelector('#saveTaskBtn'); saveBtn.textContent = 'Modifier';
    try {
        const docSnap = await getDoc(doc(dbInstance, "tasks", taskId));
        if (docSnap.exists()) {
            const data = docSnap.data();
            modalElem.querySelector('#taskTitle').value = data.title || '';
            modalElem.querySelector('#taskDescription').value = data.description || '';
            const animSelect = modalElem.querySelector('#taskAnimationLink'); await populateAnimationsForSelect(animSelect); animSelect.value = data.animationId || '';
            const memberSelect = modalElem.querySelector('#taskAssignedMembers'); await populateMembersForTaskSelect(memberSelect);
            if (data.assigneeIds && Array.isArray(data.assigneeIds)) Array.from(memberSelect.options).forEach(opt => { opt.selected = data.assigneeIds.includes(opt.value); }); else Array.from(memberSelect.options).forEach(opt => opt.selected = false);
            modalElem.querySelector('#taskBudgetSpent').value = data.budget !== undefined ? data.budget : 0;
            modalElem.querySelector('#taskStatus').value = data.status || 'todo';
            if (data.dueDate && data.dueDate.toDate) { const d=data.dueDate.toDate(); modalElem.querySelector('#taskDueDate').value = `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,'0')}-${String(d.getUTCDate()).padStart(2,'0')}`; } else { modalElem.querySelector('#taskDueDate').value = ''; }
        } else { alert("Tâche non trouvée."); commonCloseModal('addTaskModal'); return; }
    } catch (error) { console.error(error); alert("Erreur récupération tâche."); commonCloseModal('addTaskModal'); return; }
    const newSaveBtn = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', (e) => handleSaveTask(e, taskId));
}

async function handleDeleteTask(taskId) {
    if (!dbInstance || !taskId || !confirm("Supprimer cette tâche ?")) return;
    try { await deleteDoc(doc(dbInstance, "tasks", taskId)); document.dispatchEvent(new CustomEvent('tasksUpdated'));
    } catch (error) { console.error("Error deleting task:", error); alert("Erreur suppression tâche."); }
}

export async function setupAddTaskModal() {
    const modalElem = taskModalElement(); if (!modalElem || !modalElem.classList.contains('active')) {console.warn("Task modal not active for setup."); return;}
    modalElem.querySelector('.modal-title').textContent = 'Nouvelle tâche';
    const saveBtn = modalElem.querySelector('#saveTaskBtn'); saveBtn.textContent = 'Enregistrer Tâche';
    ['#taskTitle', '#taskDescription', '#taskBudgetSpent', '#taskDueDate', '#taskAnimationLink'].forEach(sel => { const el = modalElem.querySelector(sel); if (el) el.value = ''; });
    modalElem.querySelector('#taskStatus').value = 'todo';
    const memberSelect = modalElem.querySelector('#taskAssignedMembers'); if(memberSelect) Array.from(memberSelect.options).forEach(opt=>opt.selected=false);
    const animSelect = modalElem.querySelector('#taskAnimationLink');
    if(animSelect) animSelect.innerHTML = ''; if(memberSelect) memberSelect.innerHTML = ''; // Vider avant de peupler
    await Promise.all([ populateAnimationsForSelect(animSelect), populateMembersForTaskSelect(memberSelect) ]);
    if(animSelect) animSelect.value = '';
    const newSaveBtn = saveBtn.cloneNode(true); saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', (e) => handleSaveTask(e, null));
}

async function populateAnimationsForSelect(selectElement) {
    if (!selectElement || !dbInstance) { if(selectElement) selectElement.innerHTML = '<option value="" disabled>Erreur</option>'; return; }
    const current = selectElement.value; selectElement.innerHTML = '<option value="" disabled>Chargement...</option>';
    try {
        const snap = await getDocs(query(collection(dbInstance, "animations"), orderBy("title")));
        selectElement.innerHTML = '<option value="">-- Aucune animation liée --</option>';
        if (snap.empty) selectElement.innerHTML += '<option value="" disabled>Aucune animation</option>';
        else snap.docs.forEach(d => { const a={id:d.id,...d.data()},o=document.createElement('option');o.value=a.id;o.textContent=a.title||"Sans titre";selectElement.appendChild(o); });
        if(current && Array.from(selectElement.options).some(o=>o.value===current)) selectElement.value = current;
    } catch (e) { console.error(e); selectElement.innerHTML = '<option value="" disabled>Erreur chargement</option>'; }
}

async function populateMembersForTaskSelect(selectElement) {
    if (!selectElement || !dbInstance) { if(selectElement) selectElement.innerHTML = '<option value="" disabled>Erreur</option>'; return; }
    const current = Array.from(selectElement.selectedOptions).map(o=>o.value); selectElement.innerHTML = '<option value="" disabled>Chargement...</option>';
    try {
        const snap = await getDocs(query(collection(dbInstance, "members"), orderBy("firstname"), orderBy("lastname")));
        selectElement.innerHTML = '';
        if (snap.empty) selectElement.innerHTML = '<option value="" disabled>Aucun membre</option>';
        else snap.docs.forEach(d => { const m={id:d.id,...d.data()},o=document.createElement('option');o.value=m.id;o.textContent=(`${m.firstname||''} ${m.lastname||''}`.trim())||"Sans nom";if(current.includes(m.id))o.selected=true;selectElement.appendChild(o); });
    } catch (e) { console.error(e); selectElement.innerHTML = '<option value="" disabled>Erreur chargement</option>'; }
}
