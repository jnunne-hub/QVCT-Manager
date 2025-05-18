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
    query, // AJOUT: Pour interroger les tâches
    where  // AJOUT: Pour filtrer les tâches par animationId
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { openModal as commonOpenModal, closeModal as commonCloseModal } from './script.js';

let dbInstance = null;
const IMGUR_CLIENT_ID = 'd6129b56d060c8f';

export function initializeAnimationsModule(firestoreInstance) {
    dbInstance = firestoreInstance;
    console.log("Animations module initialized with Firestore instance.");
}

const animationsGridContainer = () => document.getElementById('animationsGridContainer');
const animationModalElement = () => document.getElementById('addAnimationModal');

// Fonction pour récupérer et sommer les budgets des tâches pour une animation donnée
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
    if (!dbInstance) {
        console.error("Animations module: Firestore instance not initialized.");
        return [];
    }
    const gridContainer = animationsGridContainer();
    if (!gridContainer) {
        console.warn("Animations module: Grid container not found in DOM.");
        return [];
    }
    gridContainer.innerHTML = '<p>Chargement des animations...</p>';

    try {
        const animationsCol = collection(dbInstance, "animations");
        const animationSnapshot = await getDocs(animationsCol);
        const animationListPromises = []; // Va contenir des promesses

        animationSnapshot.docs.forEach(docSnap => {
            const animationData = docSnap.data();
            const animationId = docSnap.id;

            // Créer une promesse pour chaque animation pour charger ses détails asynchrones
            const animationDetailPromise = async () => {
                const participantNames = await getParticipantNames(animationData.participantIds || []);
                const tasksBudget = await getTasksBudgetForAnimation(animationId); // NOUVEAU

                return {
                    id: animationId,
                    ...animationData,
                    participantNames,
                    tasksBudget // NOUVEAU: budget des tâches associé
                };
            };
            animationListPromises.push(animationDetailPromise());
        });

        const animationList = await Promise.all(animationListPromises); // Résoudre toutes les promesses

        displayAnimations(animationList);
        // Dispatcher l'événement après que les données (y compris les budgets) sont chargées
        // pour que le dashboard ait les infos les plus récentes
        document.dispatchEvent(new CustomEvent('animationsUpdatedForDashboard', { detail: { animations: animationList } }));
        return animationList;
    } catch (error) {
        console.error("Error loading animations:", error);
        if (gridContainer) gridContainer.innerHTML = '<p class="error-message">Erreur lors du chargement des animations.</p>';
        return [];
    }
}

async function getParticipantNames(participantIds) {
    // ... (fonction inchangée)
    if (!dbInstance || !participantIds || participantIds.length === 0) return [];
    const names = [];
    for (const memberId of participantIds) {
        try {
            const memberRef = doc(dbInstance, "members", memberId);
            const memberSnap = await getDoc(memberRef);
            if (memberSnap.exists()) {
                const memberData = memberSnap.data();
                names.push(`${memberData.firstname || ''} ${memberData.lastname || ''}`.trim());
            } else {
                names.push("Membre Supprimé");
            }
        } catch (error) {
            console.error(`Error fetching member name for ID ${memberId}:`, error);
            names.push("Erreur Nom");
        }
    }
    return names;
}

function displayAnimations(animations) {
    const gridContainer = animationsGridContainer();
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (animations.length === 0) {
        gridContainer.innerHTML = '<p>Aucune animation programmée pour le moment.</p>';
        return;
    }

    animations.forEach(anim => {
        const card = document.createElement('div');
        card.classList.add('animation-card');
        card.dataset.id = anim.id;

        let dateDisplay = "Date non spécifiée";
        if (anim.dateTime && typeof anim.dateTime.toDate === 'function') {
            try {
                dateDisplay = anim.dateTime.toDate().toLocaleDateString('fr-FR', {
                    year: 'numeric', month: 'long', day: 'numeric'
                });
            } catch (e) { console.error("Erreur formatage date pour anim:", anim.title, e); }
        }

        let membersAvatarsHTML = '';
        // ... (logique des avatars inchangée) ...
        if (anim.participantNames && anim.participantNames.length > 0) {
            const maxAvatarsToShow = 2;
            anim.participantNames.slice(0, maxAvatarsToShow).forEach(name => {
                const initials = name.split(' ').map(n => n[0]).join('').toUpperCase() || '?';
                membersAvatarsHTML += `<div class="member-avatar" title="${name}">${initials}</div>`;
            });
            if (anim.participantNames.length > maxAvatarsToShow) {
                membersAvatarsHTML += `<div class="member-avatar">+${anim.participantNames.length - maxAvatarsToShow}</div>`;
            }
        } else {
            membersAvatarsHTML = '<span class="text-muted" style="font-size:0.8em;">Aucun responsable</span>';
        }

        let documentButtonHTML = '';
        if (anim.documentUrl) {
            // S'assurer que l'URL est valide avant de créer le lien (simple vérification)
            try {
                new URL(anim.documentUrl); // Tente de créer un objet URL, lève une erreur si invalide
                documentButtonHTML = `
                    <a href="${anim.documentUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline btn-document" style="margin-top: 10px; display: inline-flex; align-items: center;">
                        <i data-feather="file-text" style="margin-right: 5px;"></i> Voir Document
                    </a>`;
            } catch (e) {
                console.warn("URL de document invalide pour l'animation:", anim.title, anim.documentUrl);
                documentButtonHTML = `<span class="text-muted" style="font-size:0.8em; margin-top:10px; display:block;">Lien document invalide</span>`;
            }
        }

        card.innerHTML = `
            <div class="animation-poster" style="background-image: url('${anim.afficheUrl || ''}'); background-color: ${anim.afficheUrl ? 'transparent' : 'var(--sage)'};">
                ${!anim.afficheUrl ? '<i data-feather="image" style="width:48px; height:48px; color: rgba(255,255,255,0.7);"></i>' : ''}
                <div class="animation-date">${dateDisplay}</div>
            </div>
            <div class="animation-content">
                <h3 class="animation-title">${anim.title || 'Animation Sans Titre'}</h3>
                <div class="animation-meta">
                    <div class="animation-meta-item"><i data-feather="map-pin"></i> ${anim.location || 'Lieu non défini'}</div>
                    <div class="animation-meta-item"><i data-feather="tag"></i> ${anim.animationType || 'Type non défini'}</div>
                    <div class="animation-meta-item"><i data-feather="activity"></i> ${anim.status || 'Statut non défini'}</div>
                    ${anim.description ? `<div class="animation-meta-item description" style="white-space: pre-wrap; word-break: break-word;"><i data-feather="align-left"></i> ${anim.description}</div>` : ''}
                    <!-- NOUVELLE LIGNE POUR LE BUDGET -->
                    <div class="animation-meta-item"><i data-feather="dollar-sign"></i> Budget Tâches: <strong>${(anim.tasksBudget || 0).toFixed(2)}€</strong></div>
                </div>
                <div class="animation-members" title="${(anim.participantNames || []).join(', ')}">
                    ${membersAvatarsHTML}
                </div>
                ${documentButtonHTML}
                <div class="animation-actions">
                    <button class="btn btn-sm btn-outline btn-edit-animation">
                        <i data-feather="edit-2"></i> Modifier
                    </button>
                    <button class="btn btn-sm btn-outline btn-delete-animation" style="color: var(--danger); border-color: var(--danger);">
                        <i data-feather="trash-2"></i> Supprimer
                    </button>
                </div>
            </div>
        `;
        gridContainer.appendChild(card);
    });
    if (typeof feather !== 'undefined') feather.replace();
    attachAnimationActionListeners();
}

// ... (Le reste du fichier animations.js : attachAnimationActionListeners, uploadToImgur, handleSaveAnimation, handleEditAnimation, handleDeleteAnimation, setupAddAnimationModal, populateMembersForSelect ... reste inchangé)
// ... (Assurez-vous que ces fonctions sont présentes)

function attachAnimationActionListeners() {
    const container = animationsGridContainer();
    if (!container) return;

    container.querySelectorAll('.btn-edit-animation').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            const card = e.target.closest('.animation-card');
            if (card && card.dataset.id) handleEditAnimation(card.dataset.id);
        });
    });

    container.querySelectorAll('.btn-delete-animation').forEach(button => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        newButton.addEventListener('click', (e) => {
            const card = e.target.closest('.animation-card');
            if (card && card.dataset.id) handleDeleteAnimation(card.dataset.id);
        });
    });
}

async function uploadToImgur(imageFile) {
    if (!imageFile) return null;
    const formData = new FormData();
    formData.append('image', imageFile);
    console.log("Uploading to Imgur...");
    try {
        const response = await fetch('https://api.imgur.com/3/image', {
            method: 'POST',
            headers: { 'Authorization': `Client-ID ${IMGUR_CLIENT_ID}` },
            body: formData,
        });
        const data = await response.json();
        if (data.success) {
            console.log("Imgur upload successful:", data.data.link);
            return data.data.link;
        } else {
            console.error("Imgur upload failed:", data);
            alert(`Erreur d'upload Imgur: ${data.data.error?.message || data.data.error || 'Erreur inconnue'}`);
            return null;
        }
    } catch (error) {
        console.error("Network error during Imgur upload:", error);
        alert("Erreur réseau lors du téléversement de l'image.");
        return null;
    }
}

async function handleSaveAnimation(event, animationIdToUpdate = null) {
    event.preventDefault();
    if (!dbInstance) { console.error("DB instance not available."); return; }

    const modalElem = animationModalElement();
    if (!modalElem) { console.error("Animation modal not found for saving."); return; }

    const saveButton = modalElem.querySelector('#saveAnimationBtn');
    const originalButtonText = saveButton.textContent;
    saveButton.textContent = 'Sauvegarde...';
    saveButton.disabled = true;

    const title = modalElem.querySelector('#animationTitle').value.trim();
    const description = modalElem.querySelector('#animationDescription').value.trim();
    const dateStr = modalElem.querySelector('#animationDate').value;
    let afficheUrl = modalElem.querySelector('#animationPosterUrl').value.trim();
    const location = modalElem.querySelector('#animationLocation').value.trim();
    const animationType = modalElem.querySelector('#animationType').value;
    const responsibleMembersSelect = modalElem.querySelector('#animationResponsibleMembers');
    const participantIds = Array.from(responsibleMembersSelect.selectedOptions).map(option => option.value);
    const imageUploadInput = modalElem.querySelector('#animationImageUpload');
    const imageFile = imageUploadInput.files[0];
    const documentUrl = modalElem.querySelector('#animationDocumentUrl').value.trim();

    if (!title || !dateStr || !location || !animationType) {
        alert("Le Titre, la Date, le Lieu et le Type sont obligatoires.");
        saveButton.textContent = originalButtonText;
        saveButton.disabled = false;
        return;
    }

    if (imageFile) {
        const uploadedUrl = await uploadToImgur(imageFile);
        if (uploadedUrl) {
            afficheUrl = uploadedUrl;
        } else {
            saveButton.textContent = originalButtonText;
            saveButton.disabled = false;
            return; // Arrêter si l'upload échoue
        }
    }

    let dateTimeStamp = null;
    if (dateStr) {
        try {
            // S'assurer que la date est correctement interprétée comme locale puis convertie en Timestamp
            const [year, month, day] = dateStr.split('-').map(Number);
            const localDate = new Date(year, month - 1, day); // Crée une date à minuit dans le fuseau horaire local
            dateTimeStamp = Timestamp.fromDate(localDate);
        } catch (e) {
            alert("Format de date invalide. Utilisez YYYY-MM-DD.");
            saveButton.textContent = originalButtonText;
            saveButton.disabled = false;
            return;
        }
    }

    const animationData = {
        title,
        description,
        dateTime: dateTimeStamp,
        afficheUrl: afficheUrl || '',
        location,
        animationType,
        participantIds,
        documentUrl: documentUrl || '',
        // status: "planifiée", // Le statut est géré plus bas
    };

    // Préserver le statut existant lors d'une mise à jour, ou définir par défaut pour une nouvelle
    if (animationIdToUpdate) {
        try {
            const existingAnimSnap = await getDoc(doc(dbInstance, "animations", animationIdToUpdate));
            if (existingAnimSnap.exists()) {
                animationData.status = existingAnimSnap.data().status || "planifiée";
            } else {
                animationData.status = "planifiée"; // Si le doc n'existe plus pour une raison
            }
        } catch(e){
            console.warn("Could not retrieve existing status for update", e);
            animationData.status = "planifiée";
        }
    } else {
        animationData.status = "planifiée"; // Statut par défaut pour une nouvelle animation
    }


    try {
        if (animationIdToUpdate) {
            const animRef = doc(dbInstance, "animations", animationIdToUpdate);
            await updateDoc(animRef, animationData);
            console.log("Animation mise à jour:", animationIdToUpdate);
        } else {
            const docRef = await addDoc(collection(dbInstance, "animations"), animationData);
            console.log("Nouvelle animation ajoutée:", docRef.id);
        }
        commonCloseModal('addAnimationModal');
        // Déclencher l'événement après la sauvegarde pour que script.js puisse mettre à jour les données globales
        document.dispatchEvent(new CustomEvent('animationsUpdated'));
    } catch (error) {
        console.error("Erreur lors de la sauvegarde de l'animation:", error);
        alert("Une erreur est survenue lors de la sauvegarde.");
    } finally {
        saveButton.textContent = originalButtonText;
        saveButton.disabled = false;
        if (imageUploadInput) imageUploadInput.value = ''; // Réinitialiser l'input file
        const preview = modalElem?.querySelector('#animationImagePreview');
        if(preview) {
            preview.style.display = 'none';
            preview.src = '#';
        }
        if (modalElem.querySelector('#animationDocumentUrl')) {
            modalElem.querySelector('#animationDocumentUrl').value = '';
        }
    }
}

async function handleEditAnimation(animationId) {
    if (!dbInstance) { console.error("DB instance not available for editing animation."); return; }

    const modalElem = commonOpenModal('addAnimationModal', 'animationModalTemplate');
    if (!modalElem) { console.error("Could not open animation modal for editing."); return; }

    modalElem.querySelector('.modal-title').textContent = 'Modifier l\'animation';
    const saveBtn = modalElem.querySelector('#saveAnimationBtn');
    saveBtn.textContent = 'Modifier';

    const imageUploadInput = modalElem.querySelector('#animationImageUpload');
    if (imageUploadInput) imageUploadInput.value = '';
    const preview = modalElem.querySelector('#animationImagePreview');
    if (preview) { preview.style.display = 'none'; preview.src = '#'; }

    try {
        const animRef = doc(dbInstance, "animations", animationId);
        const docSnap = await getDoc(animRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            modalElem.querySelector('#animationTitle').value = data.title || '';
            modalElem.querySelector('#animationDescription').value = data.description || '';
            if (data.dateTime && data.dateTime.toDate) {
                 // Pour un input type="date", on a besoin du format YYYY-MM-DD
                const date = data.dateTime.toDate();
                // Utiliser getFullYear, getMonth, getDate pour construire la string
                // car toISOString().split('T')[0] peut être affecté par le fuseau horaire
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0'); // Mois est 0-indexé
                const day = String(date.getDate()).padStart(2, '0');
                modalElem.querySelector('#animationDate').value = `${year}-${month}-${day}`;
            } else {
                 modalElem.querySelector('#animationDate').value = '';
            }
            modalElem.querySelector('#animationPosterUrl').value = data.afficheUrl || '';
            if (data.afficheUrl && preview) {
                preview.src = data.afficheUrl;
                preview.style.display = 'block';
            }
            modalElem.querySelector('#animationLocation').value = data.location || '';
            modalElem.querySelector('#animationType').value = data.animationType || 'Événement';
            modalElem.querySelector('#animationDocumentUrl').value = data.documentUrl || '';

            const membersSelect = modalElem.querySelector('#animationResponsibleMembers');
            await populateMembersForSelect(membersSelect); // S'assurer que les membres sont chargés
            if (data.participantIds && Array.isArray(data.participantIds)) {
                Array.from(membersSelect.options).forEach(option => {
                    option.selected = data.participantIds.includes(option.value);
                });
            }
        } else {
            alert("Animation non trouvée pour modification.");
            commonCloseModal('addAnimationModal'); return;
        }
    } catch (error) {
        alert("Erreur lors de la récupération de l'animation pour édition.");
        console.error("Erreur handleEditAnimation:", error);
        commonCloseModal('addAnimationModal'); return;
    }

    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', (e) => handleSaveAnimation(e, animationId));

    if (imageUploadInput) {
        imageUploadInput.onchange = evt => {
            const [file] = imageUploadInput.files;
            if (file && preview) {
                preview.src = URL.createObjectURL(file);
                preview.style.display = 'block';
                modalElem.querySelector('#animationPosterUrl').value = ''; // Vider l'URL si un fichier est choisi
            } else if (preview) {
                preview.style.display = 'none';
                preview.src = '#';
            }
        };
    }
}

async function handleDeleteAnimation(animationId) {
    if (!dbInstance || !confirm("Êtes-vous sûr de vouloir supprimer cette animation ? Ceci supprimera aussi les tâches associées !")) return;

    // Optionnel: Supprimer les tâches associées à cette animation
    // Cette partie nécessite une transaction ou des écritures par lot si vous voulez garantir la cohérence.
    // Pour simplifier, on fait des suppressions séquentielles.
    try {
        const tasksCol = collection(dbInstance, "tasks");
        const q = query(tasksCol, where("animationId", "==", animationId));
        const tasksSnapshot = await getDocs(q);
        const deletePromises = [];
        tasksSnapshot.forEach(docSnap => {
            console.log(`Préparation de la suppression de la tâche ${docSnap.id} liée à l'animation ${animationId}`);
            deletePromises.push(deleteDoc(doc(dbInstance, "tasks", docSnap.id)));
        });
        await Promise.all(deletePromises);
        console.log(`Tâches associées à l'animation ${animationId} supprimées.`);

        // Supprimer l'animation elle-même
        await deleteDoc(doc(dbInstance, "animations", animationId));
        console.log("Animation supprimée:", animationId);

        // Déclencher les événements de mise à jour
        document.dispatchEvent(new CustomEvent('animationsUpdated'));
        document.dispatchEvent(new CustomEvent('tasksUpdated')); // Puisque des tâches ont été supprimées

    } catch (error) {
        console.error("Erreur lors de la suppression de l'animation et/ou des tâches associées:", error);
        alert("Une erreur est survenue lors de la suppression.");
    }
}

export async function setupAddAnimationModal() {
    const modalElem = animationModalElement(); // Doit être ouvert par script.js avant cet appel
    if (!modalElem || !modalElem.classList.contains('active')) {
         console.error("Modal d'animation introuvable ou non actif pour setupAdd.");
         // Tenter de l'ouvrir si script.js ne l'a pas fait, mais c'est moins propre
         // commonOpenModal('addAnimationModal', 'animationModalTemplate');
         // modalElem = animationModalElement(); // Ré-obtenir la référence
         // if (!modalElem) return;
         return;
    }


    modalElem.querySelector('.modal-title').textContent = 'Nouvelle animation';
    const saveBtn = modalElem.querySelector('#saveAnimationBtn');
    saveBtn.textContent = 'Enregistrer';

    ['#animationTitle', '#animationDescription', '#animationDate', '#animationPosterUrl', '#animationLocation'].forEach(selector => {
        const el = modalElem.querySelector(selector);
        if (el) el.value = '';
    });
    modalElem.querySelector('#animationType').value = 'Événement';
    if (modalElem.querySelector('#animationDocumentUrl')) {
        modalElem.querySelector('#animationDocumentUrl').value = '';
    }
    const imageUploadInput = modalElem.querySelector('#animationImageUpload');
    if(imageUploadInput) imageUploadInput.value = '';
    const preview = modalElem.querySelector('#animationImagePreview');
    if(preview) { preview.style.display = 'none'; preview.src = '#'; }

    const membersSelect = modalElem.querySelector('#animationResponsibleMembers');
    await populateMembersForSelect(membersSelect); // Charger les membres
    if(membersSelect) Array.from(membersSelect.options).forEach(option => option.selected = false); // Déselectionner tout


    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
    newSaveBtn.addEventListener('click', (e) => handleSaveAnimation(e, null)); // null pour nouvelle animation

    if (imageUploadInput) {
        imageUploadInput.onchange = evt => {
            const [file] = imageUploadInput.files;
            if (file && preview) {
                preview.src = URL.createObjectURL(file);
                preview.style.display = 'block';
                modalElem.querySelector('#animationPosterUrl').value = '';
            } else if (preview) {
                preview.style.display = 'none';
                preview.src = '#';
            }
        };
    }
}

async function populateMembersForSelect(selectElement) {
    if (!selectElement || !dbInstance) {
        console.error("Élément Select ou instance DB manquant pour populateMembersForSelect.");
        if(selectElement) selectElement.innerHTML = '<option value="" disabled>Erreur setup</option>';
        return;
    }
    const currentValues = Array.from(selectElement.selectedOptions).map(opt => opt.value); // Sauver la sélection
    selectElement.innerHTML = '<option value="" disabled>Chargement des membres...</option>';

    try {
        const membersCol = collection(dbInstance, "members");
        const memberSnapshot = await getDocs(membersCol);

        selectElement.innerHTML = ''; // Vider avant de remplir (surtout pour multiple select)
        if (memberSnapshot.empty) {
            selectElement.innerHTML = '<option value="" disabled>Aucun membre disponible</option>';
            return;
        }

        memberSnapshot.docs.forEach(docSnap => {
            const member = { id: docSnap.id, ...docSnap.data() };
            const option = document.createElement('option');
            option.value = member.id;
            option.textContent = `${member.firstname || ''} ${member.lastname || ''}`.trim() || "Membre sans nom";
            if (currentValues.includes(member.id)) { // Restaurer la sélection
                option.selected = true;
            }
            selectElement.appendChild(option);
        });
    } catch (error) {
        console.error("Erreur lors du chargement des membres pour le sélecteur:", error);
        selectElement.innerHTML = '<option value="" disabled>Erreur chargement membres</option>';
    }
}