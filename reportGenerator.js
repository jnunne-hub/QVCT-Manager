// reportGenerator.js

// Assurez-vous que jsPDF est disponible globalement (via CDN)
const { jsPDF } = window.jspdf;

function showPdfSpinner() {
    const spinnerOverlay = document.getElementById('pdfSpinnerOverlay');
    if (spinnerOverlay) spinnerOverlay.style.display = 'flex';
}

function hidePdfSpinner() {
    const spinnerOverlay = document.getElementById('pdfSpinnerOverlay');
    if (spinnerOverlay) spinnerOverlay.style.display = 'none';
}
// Constantes pour la mise en page
const PAGE_MARGIN = 15;
const LINE_HEIGHT = 7; // Hauteur de ligne de base en mm
const SECTION_TITLE_SIZE = 16;
const SUB_TITLE_SIZE = 14;
const NORMAL_TEXT_SIZE = 10;
const SMALL_TEXT_SIZE = 8;

// Fonction principale pour générer le rapport PDF
export async function generateAnnualReportPDF(year, animationsNonReunion, reunionsData, tasksData, membersData) {
    if (!window.jspdf || !window.html2canvas) {
        alert("Les librairies de génération PDF ne sont pas chargées.");
        console.error("jsPDF or html2canvas not loaded");
        return;
    }

    showPdfSpinner();

    try {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        let currentY = PAGE_MARGIN;
        const pageWidth = doc.internal.pageSize.getWidth();
        const usableWidth = pageWidth - (2 * PAGE_MARGIN);

        function checkAndAddPage(neededHeight = 30) {
            if (currentY + neededHeight > doc.internal.pageSize.getHeight() - PAGE_MARGIN) {
                doc.addPage();
                currentY = PAGE_MARGIN;
                // Optionnel: ré-imprimer un header/footer de page si vous en avez
            }
        }

        function addSectionTitle(title) {
            checkAndAddPage(LINE_HEIGHT * 3);
            doc.setFontSize(SECTION_TITLE_SIZE);
            doc.setFont("helvetica", "bold");
            doc.text(title, PAGE_MARGIN, currentY);
            currentY += LINE_HEIGHT * 2;
            doc.setLineWidth(0.5);
            doc.line(PAGE_MARGIN, currentY - (LINE_HEIGHT * 0.8) , pageWidth - PAGE_MARGIN, currentY - (LINE_HEIGHT * 0.8));
             currentY += LINE_HEIGHT * 0.5;
        }

        // --- Titre Principal du Document ---
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text(`Bilan Annuel QVCT - ${year}`, pageWidth / 2, currentY, { align: 'center' });
        currentY += LINE_HEIGHT * 3;

        // --- SECTION 1: MEMBRES ---
        addSectionTitle("1. Membres de l'Équipe");
        doc.setFontSize(NORMAL_TEXT_SIZE);
        doc.setFont("helvetica", "normal");

        if (membersData && membersData.length > 0) {
            const head = [['Prénom', 'Nom', 'Rôle', 'Contact']];
            const body = membersData.map(m => [
                m.firstname || '',
                m.lastname || '',
                m.role || 'N/A',
                m.contact || 'N/A'
            ]);
            checkAndAddPage( (body.length + 1) * LINE_HEIGHT * 0.8 ); // Estimer hauteur tableau
            doc.autoTable({
                startY: currentY,
                head: head,
                body: body,
                theme: 'grid', // 'striped', 'grid', 'plain'
                headStyles: { fillColor: [75, 85, 99] }, // Gris foncé pour header
                styles: { fontSize: SMALL_TEXT_SIZE, cellPadding: 1.5 },
                columnStyles: {
                    0: { cellWidth: usableWidth * 0.25 },
                    1: { cellWidth: usableWidth * 0.25 },
                    2: { cellWidth: usableWidth * 0.25 },
                    3: { cellWidth: usableWidth * 0.25 }
                },
                didDrawPage: (data) => { // Si le tableau s'étend sur plusieurs pages
                    currentY = data.cursor.y + LINE_HEIGHT;
                }
            });
            // Mettre à jour currentY après le tableau si autoTable ne le fait pas comme attendu
            // Pour une seule page, on peut estimer :
            if (!doc.autoTable.previous) { // Si c'est la première (et peut-être seule) page du tableau
                 currentY = doc.autoTable.previous ? doc.autoTable.previous.finalY + LINE_HEIGHT : currentY + (body.length + 2) * LINE_HEIGHT * 0.7;
            }
        } else {
            doc.text("Aucun membre à afficher.", PAGE_MARGIN, currentY);
            currentY += LINE_HEIGHT;
        }
        currentY += LINE_HEIGHT; // Espace après la section

        // --- SECTION 2: BILAN DE L'ANNÉE ---
        addSectionTitle("2. Bilan de l'Année");

        // 2.1 Graphique : Animations (hors réunions) & Budget / Mois
        const animationsChartElement = document.getElementById('animationsChart');
        if (animationsChartElement) {
            checkAndAddPage(LINE_HEIGHT * 2 + 80); // Hauteur pour titre + graphique
            doc.setFontSize(SUB_TITLE_SIZE); doc.setFont("helvetica", "bold");
            doc.text("Animations (hors réunions) & Budget / Mois", PAGE_MARGIN, currentY);
            currentY += LINE_HEIGHT * 1.5;
            try {
                const canvas = await html2canvas(animationsChartElement, { scale: 2, backgroundColor: null });
                const imgData = canvas.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const imgWidth = usableWidth;
                const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                doc.addImage(imgData, 'PNG', PAGE_MARGIN, currentY, imgWidth, imgHeight);
                currentY += imgHeight + LINE_HEIGHT * 2;
            } catch (error) { console.error("Error adding animationsChart to PDF:", error); doc.text("Erreur graph animations/mois.", PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;}
        }

        // 2.2 Graphique : Répartition des types d'animations (toutes animations de l'année)
        const allAnimationsOfYear = [...animationsNonReunion, ...reunionsData];
        const animationTypes = {};
        allAnimationsOfYear.forEach(anim => { animationTypes[anim.animationType] = (animationTypes[anim.animationType] || 0) + 1; });

        if (Object.keys(animationTypes).length > 0) {
            checkAndAddPage(LINE_HEIGHT * 2 + 80);
            doc.setFontSize(SUB_TITLE_SIZE); doc.setFont("helvetica", "bold");
            doc.text("Répartition des Types d'Activités", PAGE_MARGIN, currentY);
            currentY += LINE_HEIGHT * 1.5;

            const typesChartContainer = document.createElement('div'); typesChartContainer.style.width = '500px'; typesChartContainer.style.height = '300px';
            const typesCanvas = document.createElement('canvas'); typesChartContainer.appendChild(typesCanvas);
            document.body.appendChild(typesChartContainer);
            const typesChart = new Chart(typesCanvas, {
                type: 'doughnut',
                data: { labels: Object.keys(animationTypes), datasets: [{ data: Object.values(animationTypes), backgroundColor: ['#B8C4B8', '#A7C5EB', '#F5B041', '#58D68D', '#AF7AC5', '#5DADE2', '#EDBB99'] }] }, // Palette plus large
                options: { responsive: false, animation: { duration: 0 }, plugins: { legend: { position: 'right'}}}
            });
            await new Promise(resolve => setTimeout(resolve, 500)); // Attendre le rendu
            try {
                const canvasImg = await html2canvas(typesChartContainer, { scale: 2, backgroundColor: '#ffffff' });
                const imgData = canvasImg.toDataURL('image/png');
                const imgProps = doc.getImageProperties(imgData);
                const imgWidth = usableWidth * 0.65; // Un peu plus petit
                const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
                const imgX = (pageWidth - imgWidth) / 2;
                doc.addImage(imgData, 'PNG', imgX, currentY, imgWidth, imgHeight);
                currentY += imgHeight + LINE_HEIGHT * 2;
            } catch (error) { console.error("Error adding types chart:", error); doc.text("Erreur graph types.", PAGE_MARGIN, currentY); currentY += LINE_HEIGHT; }
            typesChart.destroy();
            document.body.removeChild(typesChartContainer);
        }

        // 2.3 Carte du Budget Annuel
        const annualBudgetAllocated = 200 * 12;
        const annualBudgetSpent = tasksData.reduce((sum, task) => sum + (parseFloat(task.budget) || 0), 0);
        const annualBudgetRemaining = annualBudgetAllocated - annualBudgetSpent;
        checkAndAddPage(LINE_HEIGHT * 6);
        doc.setFontSize(SUB_TITLE_SIZE); doc.setFont("helvetica", "bold");
        doc.text("Synthèse Budgétaire Annuelle", PAGE_MARGIN, currentY); currentY += LINE_HEIGHT * 1.5;
        doc.setFontSize(NORMAL_TEXT_SIZE); doc.setFont("helvetica", "normal");
        doc.text(`Budget Alloué: ${annualBudgetAllocated.toFixed(2)}€`, PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;
        doc.text(`Total Dépensé (sur tâches de l'année): ${annualBudgetSpent.toFixed(2)}€`, PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;
        doc.setTextColor(annualBudgetRemaining >= 0 ? '#2ecc71' : '#e74c3c'); // Vert si positif, rouge si négatif
        doc.text(`Restant: ${annualBudgetRemaining.toFixed(2)}€`, PAGE_MARGIN, currentY);
        doc.setTextColor(0,0,0); // Rétablir la couleur de texte par défaut (noir pour jsPDF)
        currentY += LINE_HEIGHT * 2;


        // --- SECTION 3: DÉTAIL DES ACTIVITÉS ---
        addSectionTitle("3. Détail des Activités de l'Année");
        doc.setFontSize(NORMAL_TEXT_SIZE);

        if (allAnimationsOfYear.length > 0) {
            allAnimationsOfYear.sort((a,b) => (a.dateTime?.toDate() || 0) - (b.dateTime?.toDate() || 0) ); // Trier par date

            allAnimationsOfYear.forEach(anim => {
                const animTasks = tasksData.filter(t => t.animationId === anim.id);
                const animTasksBudget = animTasks.reduce((sum, t) => sum + (parseFloat(t.budget) || 0), 0);
                const participantNames = membersData
                                        .filter(m => anim.participantIds?.includes(m.id))
                                        .map(m => `${m.firstname} ${m.lastname}`)
                                        .join(', ') || 'N/A';

                // Estimer la hauteur nécessaire pour cette entrée
                let neededEntryHeight = LINE_HEIGHT * 6; // Titre, date, type, lieu, budget, participants
                if (anim.description) neededEntryHeight += LINE_HEIGHT * Math.ceil(anim.description.length / (usableWidth/2)); // Estimation lignes description
                
                checkAndAddPage(neededEntryHeight);

                doc.setFont("helvetica", "bold");
                doc.text(anim.title || "Activité sans titre", PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;
                doc.setFont("helvetica", "normal");
                const dateStr = anim.dateTime && typeof anim.dateTime.toDate === 'function' ? anim.dateTime.toDate().toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit', year:'numeric'}) : 'N/A';
                doc.text(`Date: ${dateStr}   |   Type: ${anim.animationType || 'N/A'}`, PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;
                doc.text(`Lieu: ${anim.location || 'N/A'}`, PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;
                doc.text(`Budget Tâches: ${animTasksBudget.toFixed(2)}€`, PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;
                doc.text(`Participants: ${participantNames}`, PAGE_MARGIN, currentY); currentY += LINE_HEIGHT;
                if (anim.description) {
                    doc.text(`Description: ${anim.description}`, PAGE_MARGIN, currentY, { maxWidth: usableWidth });
                    currentY += LINE_HEIGHT * (Math.ceil(doc.getTextDimensions(anim.description, {maxWidth: usableWidth}).h / (LINE_HEIGHT*0.7)) +1) ; // Ajuster Y en fonction de la hauteur du texte
                }
                currentY += LINE_HEIGHT * 0.5; // Petit espace avant la prochaine
                 if (currentY > doc.internal.pageSize.getHeight() - PAGE_MARGIN - LINE_HEIGHT) { // Vérif avant la ligne
                     doc.addPage(); currentY = PAGE_MARGIN;
                 }
                doc.setDrawColor(200); // Couleur de ligne grise
                doc.line(PAGE_MARGIN, currentY, pageWidth - PAGE_MARGIN, currentY); // Ligne séparatrice
                currentY += LINE_HEIGHT;
            });

        } else {
            doc.text("Aucune activité (animation ou réunion) à détailler pour cette année.", PAGE_MARGIN, currentY);
            currentY += LINE_HEIGHT;
        }


        // --- FIN DU DOCUMENT ---
        doc.save(`Bilan_Annuel_QVCT_${year}.pdf`);
        console.log("PDF generation complete.");

    } catch (error) {
        console.error("Error during PDF generation process:", error);
        alert("Une erreur est survenue lors de la génération du PDF.");
    } finally {
        hidePdfSpinner();
    }
}