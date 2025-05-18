// member.js
import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    doc,
    getDoc, // Importé pour récupérer un membre par ID
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { openModal as commonOpenModal, closeModal as commonCloseModal } from './script.js'; // Importer les fonctions de modal depuis script.js

let dbInstance = null; // Sera initialisé depuis script.js

export function initializeMembersModule(firestoreInstance) {
    dbInstance = firestoreInstance;
}

const membersGridContainer = () => document.getElementById('membersGridContainer');

export async function loadMembers() {
    if (!dbInstance) {
        console.error("Members module not initialized with Firestore instance.");
        return []; // Retourner un tableau vide en cas d'erreur
    }
    if (!membersGridContainer()) {
        console.log("Members grid container not found during loadMembers.");
        return [];
    }
    console.log("Loading members from member.js...");
    membersGridContainer().innerHTML = '<p>Chargement des membres...</p>';

    try {
        const membersCol = collection(dbInstance, "members");
        const memberSnapshot = await getDocs(membersCol);
        const memberList = memberSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        displayMembers(memberList);
        return memberList; // Retourner la liste pour que script.js puisse l'utiliser (ex: stats)
    } catch (error) {
        console.error("Error loading members (member.js): ", error);
        if (membersGridContainer()) membersGridContainer().innerHTML = '<p class="error-message">Erreur lors du chargement des membres.</p>';
        return [];
    }
}

function displayMembers(members) {
    if (!membersGridContainer()) return;
    membersGridContainer().innerHTML = ''; 

    if (members.length === 0) {
        membersGridContainer().innerHTML = '<p>Aucun membre trouvé.</p>';
        return;
    }

    members.forEach(member => {
        const card = document.createElement('div');
        card.classList.add('member-card');
        card.dataset.id = member.id;

        const initials = `${member.firstname ? member.firstname[0] : ''}${member.lastname ? member.lastname[0] : ''}`.toUpperCase();
        const avatarUrl = member.avatarUrl || '';

        card.innerHTML = `
            <div class="member-card-avatar" style="${avatarUrl ? `background-image: url('${avatarUrl}'); background-size: cover; background-position: center;` : ''}">
                ${!avatarUrl ? initials : ''}
            </div>
            <h3 class="member-card-name">${member.firstname || ''} ${member.lastname || ''}</h3>
            <div class="member-card-role">${member.role || 'N/A'}</div>
            <div class="member-card-email">
                <i data-feather="mail"></i> ${member.contact || 'N/A'}
            </div>
            <div class="member-card-actions">
                <button class="btn btn-sm btn-outline btn-edit-member">
                    <i data-feather="edit-2"></i> Modifier
                </button>
                <button class="btn btn-sm btn-outline btn-delete-member" style="color: var(--danger); border-color: var(--danger);">
                    <i data-feather="trash-2"></i> Supprimer
                </button>
            </div>
        `;
        membersGridContainer().appendChild(card);
    });
    if (typeof feather !== 'undefined') feather.replace();
    attachMemberActionListeners();
}

function attachMemberActionListeners() {
    const container = membersGridContainer();
    if (!container) return;

    container.querySelectorAll('.btn-edit-member').forEach(button => {
        // Supprimer les anciens écouteurs pour éviter les doublons si cette fonction est appelée plusieurs fois
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            const card = e.target.closest('.member-card');
            const memberId = card.dataset.id;
            handleEditMember(memberId);
        });
    });

    container.querySelectorAll('.btn-delete-member').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            const card = e.target.closest('.member-card');
            const memberId = card.dataset.id;
            handleDeleteMember(memberId);
        });
    });
}

async function handleSaveMember(event, memberIdToUpdate = null) {
    event.preventDefault();
    if (!dbInstance) {
        console.error("DB instance not available in handleSaveMember.");
        return;
    }

    const modal = document.getElementById('addMemberModal');
    if (!modal) {
        console.error("Member modal not found.");
        return;
    }

    const firstName = modal.querySelector('#memberFirstName').value.trim();
    const lastName = modal.querySelector('#memberLastName').value.trim();
    const role = modal.querySelector('#memberRole').value.trim();
    const email = modal.querySelector('#memberEmail').value.trim().toLowerCase();
    const avatarUrl = modal.querySelector('#memberAvatarUrl').value.trim();

    if (!firstName || !lastName || !email || !role) {
        alert("Veuillez remplir Prénom, Nom, Email (contact), et Fonction.");
        return;
    }

    const memberData = {
        firstname: firstName,
        lastname: lastName,
        role: role,
        contact: email,
        avatarUrl: avatarUrl || '',
    };

    const saveButton = modal.querySelector('#saveMemberBtn');
    const originalButtonText = saveButton.textContent;
    saveButton.textContent = 'Enregistrement...';
    saveButton.disabled = true;

    try {
        if (memberIdToUpdate) {
            const memberRef = doc(dbInstance, "members", memberIdToUpdate);
            await updateDoc(memberRef, memberData);
            console.log("Membre mis à jour (member.js) ID:", memberIdToUpdate);
        } else {
            const docRef = await addDoc(collection(dbInstance, "members"), memberData);
            console.log("Nouveau membre ajouté (member.js) ID:", docRef.id);
        }
        commonCloseModal('addMemberModal');
        const updatedMembers = await loadMembers(); // Recharger et obtenir la liste mise à jour
        // Mettre à jour les stats dans script.js si nécessaire
        const statsUpdateEvent = new CustomEvent('statsShouldUpdate', { detail: { membersCount: updatedMembers.length } });
        document.dispatchEvent(statsUpdateEvent);

    } catch (error) {
        console.error("Erreur lors de l'enregistrement du membre (member.js):", error);
        alert("Erreur lors de l'enregistrement du membre.");
    } finally {
        saveButton.textContent = originalButtonText;
        saveButton.disabled = false;
    }
}

async function handleEditMember(memberId) {
    if (!dbInstance) return;
    console.log("Modification du membre ID (member.js):", memberId);
    
    commonOpenModal('addMemberModal', 'memberModalTemplate'); // Ouvre le modal via la fonction commune
    const modal = document.getElementById('addMemberModal');

    if (modal) {
        modal.querySelector('.modal-title').textContent = 'Modifier le membre';
        const saveBtn = modal.querySelector('#saveMemberBtn');
        saveBtn.textContent = 'Modifier';
        
        // Récupérer les données du membre pour pré-remplir
        try {
            const memberRef = doc(dbInstance, "members", memberId);
            const docSnap = await getDoc(memberRef);

            if (docSnap.exists()) {
                const memberDataFromDb = docSnap.data();
                modal.querySelector('#memberFirstName').value = memberDataFromDb.firstname || '';
                modal.querySelector('#memberLastName').value = memberDataFromDb.lastname || '';
                modal.querySelector('#memberRole').value = memberDataFromDb.role || '';
                modal.querySelector('#memberEmail').value = memberDataFromDb.contact || '';
                modal.querySelector('#memberAvatarUrl').value = memberDataFromDb.avatarUrl || '';
            } else {
                console.error("Aucun document trouvé pour l'ID membre:", memberId);
                commonCloseModal('addMemberModal');
                alert("Membre non trouvé.");
                return;
            }
        } catch (error) {
            console.error("Erreur lors de la récupération du membre pour édition:", error);
            commonCloseModal('addMemberModal');
            alert("Erreur lors de la récupération des informations du membre.");
            return;
        }

        // Attacher l'écouteur pour la soumission de la modification
        // Cloner le bouton pour s'assurer que l'ancien écouteur est retiré
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', (e) => handleSaveMember(e, memberId));
    }
}

async function handleDeleteMember(memberId) {
    if (!dbInstance) return;
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible.")) {
        return;
    }
    console.log("Suppression du membre ID (member.js):", memberId);
    try {
        await deleteDoc(doc(dbInstance, "members", memberId));
        console.log("Membre supprimé (member.js):", memberId);
        const updatedMembers = await loadMembers();
        const statsUpdateEvent = new CustomEvent('statsShouldUpdate', { detail: { membersCount: updatedMembers.length } });
        document.dispatchEvent(statsUpdateEvent);

    } catch (error) {
        console.error("Erreur lors de la suppression du membre (member.js):", error);
        alert("Erreur lors de la suppression.");
    }
}

// La fonction pour ouvrir le modal pour "Ajouter un nouveau membre" sera appelée depuis script.js
// Elle utilisera commonOpenModal et configurera le bouton de sauvegarde pour appeler handleSaveMember sans ID.
export function setupAddMemberModal() {
    const modal = document.getElementById('addMemberModal');
    if (modal) {
        modal.querySelector('.modal-title').textContent = 'Nouveau membre';
        const saveBtn = modal.querySelector('#saveMemberBtn');
        saveBtn.textContent = 'Enregistrer';

        // Vider les champs pour un nouveau membre
        modal.querySelector('#memberFirstName').value = '';
        modal.querySelector('#memberLastName').value = '';
        modal.querySelector('#memberRole').value = '';
        modal.querySelector('#memberEmail').value = '';
        modal.querySelector('#memberAvatarUrl').value = '';

        // Assurer que le bouton de sauvegarde appelle handleSaveMember sans ID (pour l'ajout)
        const newSaveBtn = saveBtn.cloneNode(true);
        saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
        newSaveBtn.addEventListener('click', (e) => handleSaveMember(e, null));
    }
}