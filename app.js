// ===== GESTION DES DONNÉES =====
class DataManager {
    constructor() {
        this.storageKey = 'badminton_eval_data';
        this.data = this.loadData();
    }

    loadData() {
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
            return JSON.parse(stored);
        }
        return {
            classes: [],
            students: [],
            evaluations: [],
            version: '1.0'
        };
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    }

    // Classes
    addClass(className) {
        const classId = Date.now().toString();
        this.data.classes.push({
            id: classId,
            name: className,
            createdAt: new Date().toISOString()
        });
        this.saveData();
        return classId;
    }

    getClasses() {
        return this.data.classes;
    }

    deleteClass(classId) {
        // Supprimer la classe
        this.data.classes = this.data.classes.filter(c => c.id !== classId);
        // Supprimer les élèves associés
        const studentIds = this.data.students
            .filter(s => s.classId === classId)
            .map(s => s.id);
        this.data.students = this.data.students.filter(s => s.classId !== classId);
        // Supprimer les évaluations associées
        this.data.evaluations = this.data.evaluations.filter(e => !studentIds.includes(e.studentId));
        this.saveData();
    }

    // Élèves
    addStudent(classId, studentName) {
        const studentId = Date.now().toString();
        this.data.students.push({
            id: studentId,
            classId: classId,
            name: studentName,
            createdAt: new Date().toISOString()
        });
        this.saveData();
        return studentId;
    }

    getStudentsByClass(classId) {
        return this.data.students.filter(s => s.classId === classId);
    }

    getAllStudents() {
        return this.data.students;
    }

    getStudent(studentId) {
        return this.data.students.find(s => s.id === studentId);
    }

    deleteStudent(studentId) {
        this.data.students = this.data.students.filter(s => s.id !== studentId);
        this.data.evaluations = this.data.evaluations.filter(e => e.studentId !== studentId);
        this.saveData();
    }

    // Évaluations
    saveEvaluation(studentId, evalType, evalData) {
        // Chercher si une évaluation existe déjà pour cet élève et ce type
        const existingIndex = this.data.evaluations.findIndex(
            e => e.studentId === studentId && e.type === evalType
        );

        const evaluation = {
            studentId: studentId,
            type: evalType, // 'sequence' ou 'finale'
            data: evalData,
            updatedAt: new Date().toISOString()
        };

        if (existingIndex >= 0) {
            // Mettre à jour
            this.data.evaluations[existingIndex] = evaluation;
        } else {
            // Créer
            this.data.evaluations.push(evaluation);
        }

        this.saveData();
    }

    getEvaluation(studentId, evalType) {
        return this.data.evaluations.find(
            e => e.studentId === studentId && e.type === evalType
        );
    }

    getStudentTotalScore(studentId) {
        const sequenceEval = this.getEvaluation(studentId, 'sequence');
        const finaleEval = this.getEvaluation(studentId, 'finale');

        let total = 0;
        if (sequenceEval) {
            total += parseFloat(sequenceEval.data.totalScore || 0);
        }
        if (finaleEval) {
            total += parseFloat(finaleEval.data.totalScore || 0);
        }

        return total;
    }

    getAllEvaluations() {
        return this.data.evaluations;
    }

    clearAll() {
        if (confirm('⚠️ Êtes-vous sûr de vouloir supprimer TOUTES les données ? Cette action est irréversible.')) {
            localStorage.removeItem(this.storageKey);
            this.data = {
                classes: [],
                students: [],
                evaluations: [],
                version: '1.0'
            };
            location.reload();
        }
    }

    exportJSON() {
        return JSON.stringify(this.data, null, 2);
    }

    importJSON(jsonData) {
        try {
            const imported = JSON.parse(jsonData);
            if (imported.classes && imported.students && imported.evaluations) {
                this.data = imported;
                this.saveData();
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }
}

// Instance globale
const dataManager = new DataManager();

// ===== GESTION DE L'INTERFACE =====

// Changement d'onglet
function switchTab(tabName) {
    // Désactiver tous les onglets
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Activer l'onglet sélectionné
    event.target.classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');

    // Rafraîchir le contenu selon l'onglet
    if (tabName === 'classes') {
        updateClassesList();
    } else if (tabName === 'evaluate') {
        updateEvaluateTab();
    } else if (tabName === 'results') {
        updateResultsTab();
    }
}

// ===== GESTION DES CLASSES =====

function addClass() {
    const input = document.getElementById('className');
    const className = input.value.trim();

    if (!className) {
        alert('⚠️ Veuillez entrer un nom de classe');
        return;
    }

    dataManager.addClass(className);
    input.value = '';
    updateClassesList();
    updateAllSelects();
    showNotification('✅ Classe ajoutée avec succès');
}

function updateClassesList() {
    const classes = dataManager.getClasses();
    const container = document.getElementById('classesList');

    if (classes.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucune classe créée</div>';
        return;
    }

    let html = '';
    classes.forEach(classe => {
        const students = dataManager.getStudentsByClass(classe.id);
        html += `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <h3 style="margin: 0;">${classe.name}</h3>
                    <button class="btn btn-danger btn-small" onclick="deleteClass('${classe.id}')">🗑️ Supprimer</button>
                </div>
                <p style="color: var(--gray-700); margin-bottom: 15px;">
                    ${students.length} élève(s)
                </p>
                ${students.length > 0 ? `
                    <ul class="student-list">
                        ${students.map(student => {
                            const totalScore = dataManager.getStudentTotalScore(student.id);
                            return `
                                <li class="student-item">
                                    <div class="student-info">
                                        <div class="student-name">${student.name}</div>
                                        <div class="student-note">Note totale: ${totalScore.toFixed(1)} / 20</div>
                                    </div>
                                    <button class="btn btn-danger btn-small" onclick="deleteStudent('${student.id}')">🗑️</button>
                                </li>
                            `;
                        }).join('')}
                    </ul>
                ` : '<p style="color: var(--gray-700); font-style: italic;">Aucun élève dans cette classe</p>'}
            </div>
        `;
    });

    container.innerHTML = html;
}

function deleteClass(classId) {
    if (confirm('⚠️ Supprimer cette classe et tous ses élèves ?')) {
        dataManager.deleteClass(classId);
        updateClassesList();
        updateAllSelects();
        showNotification('✅ Classe supprimée');
    }
}

function updateStudentForm() {
    const select = document.getElementById('selectClass');
    const section = document.getElementById('studentFormSection');

    if (select.value) {
        section.style.display = 'block';
    } else {
        section.style.display = 'none';
    }
}

function addStudent() {
    const classSelect = document.getElementById('selectClass');
    const nameInput = document.getElementById('studentName');

    const classId = classSelect.value;
    const studentName = nameInput.value.trim();

    if (!classId) {
        alert('⚠️ Veuillez sélectionner une classe');
        return;
    }

    if (!studentName) {
        alert('⚠️ Veuillez entrer le nom de l\'élève');
        return;
    }

    dataManager.addStudent(classId, studentName);
    nameInput.value = '';
    updateClassesList();
    showNotification('✅ Élève ajouté avec succès');
}

function deleteStudent(studentId) {
    if (confirm('⚠️ Supprimer cet élève et ses évaluations ?')) {
        dataManager.deleteStudent(studentId);
        updateClassesList();
        showNotification('✅ Élève supprimé');
    }
}

// ===== GESTION DE L'ÉVALUATION =====

let currentEvaluation = {
    type: 'sequence',
    studentId: null,
    aflp4Degree: null,
    aflp5Degree: null,
    aflp1Degree: null,
    aflp2Degree: null,
    pointsDistribution: '4-4'
};

function updateEvalType() {
    const selectedType = document.querySelector('input[name="evalType"]:checked').value;
    currentEvaluation.type = selectedType;

    const sequenceForm = document.getElementById('sequenceEvalForm');
    const finaleForm = document.getElementById('finaleEvalForm');

    if (selectedType === 'sequence') {
        sequenceForm.style.display = 'block';
        finaleForm.style.display = 'none';
    } else {
        sequenceForm.style.display = 'none';
        finaleForm.style.display = 'block';
    }
}

function updateEvaluateTab() {
    updateAllSelects();
}

function updateEvalStudents() {
    const classSelect = document.getElementById('evalClass');
    const studentSelect = document.getElementById('evalStudent');
    const classId = classSelect.value;

    studentSelect.innerHTML = '<option value="">-- Choisir un élève --</option>';

    if (!classId) return;

    const students = dataManager.getStudentsByClass(classId);
    students.forEach(student => {
        const option = document.createElement('option');
        option.value = student.id;
        option.textContent = student.name;
        studentSelect.appendChild(option);
    });
}

function loadStudentEval() {
    const studentId = document.getElementById('evalStudent').value;
    if (!studentId) return;

    currentEvaluation.studentId = studentId;

    // Charger l'évaluation existante si elle existe
    const evalType = currentEvaluation.type;
    const existing = dataManager.getEvaluation(studentId, evalType);

    if (existing) {
        if (evalType === 'sequence') {
            loadSequenceEval(existing.data);
        } else {
            loadFinaleEval(existing.data);
        }
        showNotification('ℹ️ Évaluation existante chargée');
    } else {
        if (evalType === 'sequence') {
            resetSequenceForm();
        } else {
            resetFinaleForm();
        }
    }
}

// === ÉVALUATION SÉQUENCE ===

function updatePointsDisplay() {
    const distribution = document.querySelector('input[name="pointsDistribution"]:checked').value;
    currentEvaluation.pointsDistribution = distribution;

    const [aflp4Points, aflp5Points] = distribution.split('-').map(Number);

    document.getElementById('aflp4Points').textContent = aflp4Points;
    document.getElementById('aflp5Points').textContent = aflp5Points;

    calculateSequenceTotal();
}

function selectDegree(aflp, degree) {
    // Mettre à jour la sélection visuelle
    document.querySelectorAll(`[onclick*="${aflp}"]`).forEach(btn => {
        btn.classList.remove('selected');
    });
    event.target.closest('.degree-btn').classList.add('selected');

    // Enregistrer la sélection
    if (aflp === 'aflp4') {
        currentEvaluation.aflp4Degree = degree;
    } else if (aflp === 'aflp5') {
        currentEvaluation.aflp5Degree = degree;
    } else if (aflp === 'aflp1') {
        currentEvaluation.aflp1Degree = degree;
        calculateAFLP1();
    } else if (aflp === 'aflp2') {
        currentEvaluation.aflp2Degree = degree;
        setAFLP2Score(degree);
    }

    if (currentEvaluation.type === 'sequence') {
        calculateSequenceTotal();
    } else {
        calculateFinaleTotal();
    }
}

function calculateSequenceTotal() {
    const distribution = currentEvaluation.pointsDistribution;
    const [maxAflp4, maxAflp5] = distribution.split('-').map(Number);

    let aflp4Score = 0;
    let aflp5Score = 0;

    if (currentEvaluation.aflp4Degree) {
        // Calcul avec coefficient
        const baseScore = currentEvaluation.aflp4Degree;
        const coefficient = maxAflp4 / 4; // 0.5, 1, ou 1.5
        aflp4Score = baseScore * coefficient;
    }

    if (currentEvaluation.aflp5Degree) {
        const baseScore = currentEvaluation.aflp5Degree;
        const coefficient = maxAflp5 / 4;
        aflp5Score = baseScore * coefficient;
    }

    const total = aflp4Score + aflp5Score;
    document.getElementById('sequenceTotal').textContent = total.toFixed(1);

    return total;
}

function saveSequenceEval() {
    if (!currentEvaluation.studentId) {
        alert('⚠️ Veuillez sélectionner un élève');
        return;
    }

    if (!currentEvaluation.aflp4Degree || !currentEvaluation.aflp5Degree) {
        alert('⚠️ Veuillez évaluer tous les AFLP');
        return;
    }

    const total = calculateSequenceTotal();
    const [maxAflp4, maxAflp5] = currentEvaluation.pointsDistribution.split('-').map(Number);

    const evalData = {
        pointsDistribution: currentEvaluation.pointsDistribution,
        aflp4Degree: currentEvaluation.aflp4Degree,
        aflp5Degree: currentEvaluation.aflp5Degree,
        aflp4Score: (currentEvaluation.aflp4Degree * (maxAflp4 / 4)).toFixed(1),
        aflp5Score: (currentEvaluation.aflp5Degree * (maxAflp5 / 4)).toFixed(1),
        totalScore: total.toFixed(1)
    };

    dataManager.saveEvaluation(currentEvaluation.studentId, 'sequence', evalData);
    showNotification('✅ Évaluation séquence enregistrée');
    updateClassesList();
}

function resetSequenceForm() {
    currentEvaluation.aflp4Degree = null;
    currentEvaluation.aflp5Degree = null;
    currentEvaluation.pointsDistribution = '4-4';

    document.querySelectorAll('input[name="pointsDistribution"]')[0].checked = true;
    document.querySelectorAll('.degree-btn').forEach(btn => btn.classList.remove('selected'));
    document.getElementById('sequenceTotal').textContent = '0';
    updatePointsDisplay();
}

function loadSequenceEval(data) {
    resetSequenceForm();

    // Restaurer la distribution
    const radios = document.querySelectorAll('input[name="pointsDistribution"]');
    radios.forEach(radio => {
        if (radio.value === data.pointsDistribution) {
            radio.checked = true;
        }
    });
    currentEvaluation.pointsDistribution = data.pointsDistribution;
    updatePointsDisplay();

    // Restaurer les degrés
    if (data.aflp4Degree) {
        currentEvaluation.aflp4Degree = data.aflp4Degree;
        const btn = document.querySelector(`[onclick="selectDegree('aflp4', ${data.aflp4Degree})"]`);
        if (btn) btn.classList.add('selected');
    }

    if (data.aflp5Degree) {
        currentEvaluation.aflp5Degree = data.aflp5Degree;
        const btn = document.querySelector(`[onclick="selectDegree('aflp5', ${data.aflp5Degree})"]`);
        if (btn) btn.classList.add('selected');
    }

    calculateSequenceTotal();
}

// === ÉVALUATION FINALE ===

function calculateAFLP1() {
    const totalMatches = parseInt(document.getElementById('totalMatches').value) || 0;
    const wonMatches = parseInt(document.getElementById('wonMatches').value) || 0;

    if (totalMatches === 0) return;

    const ratio = wonMatches / totalMatches;

    // Déterminer le degré
    let suggestedDegree = 1;
    if (ratio === 0) {
        suggestedDegree = 1;
    } else if (ratio < 0.5) {
        suggestedDegree = 2;
    } else if (ratio < 0.9) {
        suggestedDegree = 3;
    } else {
        suggestedDegree = 4;
    }

    // Suggestions de score selon le degré
    const scoreRanges = {
        1: { min: 0, max: 1 },
        2: { min: 1.5, max: 3 },
        3: { min: 3.5, max: 5 },
        4: { min: 5.5, max: 7 }
    };

    const range = scoreRanges[suggestedDegree];
    const suggestedScore = range.min + (ratio * (range.max - range.min));

    document.getElementById('aflp1Score').value = suggestedScore.toFixed(1);
    calculateFinaleTotal();
}

function setAFLP2Score(degree) {
    const scoreRanges = {
        1: 0.5,
        2: 1.5,
        3: 3,
        4: 4.5
    };

    document.getElementById('aflp2Score').value = scoreRanges[degree] || 0;
    calculateFinaleTotal();
}

function calculateFinaleTotal() {
    const aflp1 = parseFloat(document.getElementById('aflp1Score').value) || 0;
    const aflp2 = parseFloat(document.getElementById('aflp2Score').value) || 0;

    const total = aflp1 + aflp2;
    document.getElementById('finaleTotal').textContent = total.toFixed(1);

    return total;
}

function saveFinaleEval() {
    if (!currentEvaluation.studentId) {
        alert('⚠️ Veuillez sélectionner un élève');
        return;
    }

    const aflp1 = parseFloat(document.getElementById('aflp1Score').value) || 0;
    const aflp2 = parseFloat(document.getElementById('aflp2Score').value) || 0;

    if (aflp1 === 0 && aflp2 === 0) {
        alert('⚠️ Veuillez évaluer les AFLP');
        return;
    }

    const total = calculateFinaleTotal();

    const evalData = {
        totalMatches: parseInt(document.getElementById('totalMatches').value) || 0,
        wonMatches: parseInt(document.getElementById('wonMatches').value) || 0,
        aflp1Degree: currentEvaluation.aflp1Degree,
        aflp2Degree: currentEvaluation.aflp2Degree,
        aflp1Score: aflp1.toFixed(1),
        aflp2Score: aflp2.toFixed(1),
        totalScore: total.toFixed(1)
    };

    dataManager.saveEvaluation(currentEvaluation.studentId, 'finale', evalData);
    showNotification('✅ Évaluation finale enregistrée');
    updateClassesList();
}

function resetFinaleForm() {
    currentEvaluation.aflp1Degree = null;
    currentEvaluation.aflp2Degree = null;

    document.getElementById('totalMatches').value = 3;
    document.getElementById('wonMatches').value = 0;
    document.getElementById('aflp1Score').value = 0;
    document.getElementById('aflp2Score').value = 0;
    document.getElementById('finaleTotal').textContent = '0';

    document.querySelectorAll('.degree-btn').forEach(btn => btn.classList.remove('selected'));
}

function loadFinaleEval(data) {
    resetFinaleForm();

    if (data.totalMatches) {
        document.getElementById('totalMatches').value = data.totalMatches;
    }
    if (data.wonMatches) {
        document.getElementById('wonMatches').value = data.wonMatches;
    }
    if (data.aflp1Score) {
        document.getElementById('aflp1Score').value = data.aflp1Score;
    }
    if (data.aflp2Score) {
        document.getElementById('aflp2Score').value = data.aflp2Score;
    }

    if (data.aflp1Degree) {
        currentEvaluation.aflp1Degree = data.aflp1Degree;
        const btn = document.querySelector(`[onclick="selectDegree('aflp1', ${data.aflp1Degree})"]`);
        if (btn) btn.classList.add('selected');
    }

    if (data.aflp2Degree) {
        currentEvaluation.aflp2Degree = data.aflp2Degree;
        const btn = document.querySelector(`[onclick="selectDegree('aflp2', ${data.aflp2Degree})"]`);
        if (btn) btn.classList.add('selected');
    }

    calculateFinaleTotal();
}

// ===== RÉSULTATS =====

function updateResultsTab() {
    updateResultsSelects();
    displayStats();
    displayResults();
}

function updateResultsSelects() {
    const select = document.getElementById('resultsClass');
    select.innerHTML = '<option value="">-- Toutes les classes --</option>';

    const classes = dataManager.getClasses();
    classes.forEach(classe => {
        const option = document.createElement('option');
        option.value = classe.id;
        option.textContent = classe.name;
        select.appendChild(option);
    });
}

function displayStats() {
    const statsContainer = document.getElementById('statsGrid');
    const classes = dataManager.getClasses();
    const students = dataManager.getAllStudents();
    const evaluations = dataManager.getAllEvaluations();

    // Calculer les moyennes
    let totalScores = 0;
    let countScores = 0;

    students.forEach(student => {
        const score = dataManager.getStudentTotalScore(student.id);
        if (score > 0) {
            totalScores += score;
            countScores++;
        }
    });

    const average = countScores > 0 ? (totalScores / countScores).toFixed(1) : 0;

    statsContainer.innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${classes.length}</div>
            <div class="stat-label">Classes</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${students.length}</div>
            <div class="stat-label">Élèves</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${evaluations.length}</div>
            <div class="stat-label">Évaluations</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${average}</div>
            <div class="stat-label">Moyenne générale / 20</div>
        </div>
    `;
}

function displayResults() {
    const classId = document.getElementById('resultsClass').value;
    const container = document.getElementById('resultsDisplay');

    let students;
    if (classId) {
        students = dataManager.getStudentsByClass(classId);
    } else {
        students = dataManager.getAllStudents();
    }

    if (students.length === 0) {
        container.innerHTML = '<div class="empty-state">Aucun élève à afficher</div>';
        return;
    }

    // Trier par note décroissante
    students.sort((a, b) => {
        const scoreA = dataManager.getStudentTotalScore(a.id);
        const scoreB = dataManager.getStudentTotalScore(b.id);
        return scoreB - scoreA;
    });

    let html = '<ul class="student-list">';

    students.forEach((student, index) => {
        const classe = dataManager.getClasses().find(c => c.id === student.classId);
        const sequenceEval = dataManager.getEvaluation(student.id, 'sequence');
        const finaleEval = dataManager.getEvaluation(student.id, 'finale');
        const totalScore = dataManager.getStudentTotalScore(student.id);

        html += `
            <li class="student-item">
                <div class="student-info">
                    <div class="student-name">#${index + 1} - ${student.name}</div>
                    <div class="student-note">
                        ${classe ? classe.name : 'Classe inconnue'} | 
                        Séquence: ${sequenceEval ? sequenceEval.data.totalScore : '-'}/8 | 
                        Finale: ${finaleEval ? finaleEval.data.totalScore : '-'}/12
                    </div>
                </div>
                <div class="note-badge">${totalScore.toFixed(1)}/20</div>
            </li>
        `;
    });

    html += '</ul>';
    container.innerHTML = html;
}

// ===== EXPORT / IMPORT =====

function exportToCSV() {
    const students = dataManager.getAllStudents();
    const classes = dataManager.getClasses();

    let csv = 'Classe,Nom,AFLP4 Degré,AFLP4 Note,AFLP5 Degré,AFLP5 Note,Note Séquence (/8),AFLP1 Degré,AFLP1 Note,AFLP2 Degré,AFLP2 Note,Note Finale (/12),Note Totale (/20)\n';

    students.forEach(student => {
        const classe = classes.find(c => c.id === student.classId);
        const sequenceEval = dataManager.getEvaluation(student.id, 'sequence');
        const finaleEval = dataManager.getEvaluation(student.id, 'finale');
        const totalScore = dataManager.getStudentTotalScore(student.id);

        const row = [
            classe ? classe.name : '',
            student.name,
            sequenceEval ? sequenceEval.data.aflp4Degree : '',
            sequenceEval ? sequenceEval.data.aflp4Score : '',
            sequenceEval ? sequenceEval.data.aflp5Degree : '',
            sequenceEval ? sequenceEval.data.aflp5Score : '',
            sequenceEval ? sequenceEval.data.totalScore : '',
            finaleEval ? finaleEval.data.aflp1Degree : '',
            finaleEval ? finaleEval.data.aflp1Score : '',
            finaleEval ? finaleEval.data.aflp2Degree : '',
            finaleEval ? finaleEval.data.aflp2Score : '',
            finaleEval ? finaleEval.data.totalScore : '',
            totalScore.toFixed(1)
        ];

        csv += row.join(',') + '\n';
    });

    downloadFile('evaluations_badminton.csv', csv, 'text/csv');
    showNotification('✅ Export CSV téléchargé');
}

function exportJSON() {
    const json = dataManager.exportJSON();
    const date = new Date().toISOString().split('T')[0];
    downloadFile(`backup_badminton_${date}.json`, json, 'application/json');
    showNotification('✅ Backup JSON téléchargé');
}

function importJSON() {
    const fileInput = document.getElementById('importFile');
    const file = fileInput.files[0];

    if (!file) {
        alert('⚠️ Veuillez sélectionner un fichier');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const success = dataManager.importJSON(e.target.result);
        if (success) {
            showNotification('✅ Import réussi');
            location.reload();
        } else {
            alert('❌ Erreur lors de l\'import. Vérifiez le fichier.');
        }
    };
    reader.readAsText(file);
}

function clearAllData() {
    dataManager.clearAll();
}

// ===== UTILITAIRES =====

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showNotification(message) {
    // Simple notification en haut de page
    const notification = document.createElement('div');
    notification.className = 'alert alert-success';
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.animation = 'fadeIn 0.3s';
    notification.innerHTML = `<span>✓</span> ${message}`;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'fadeOut 0.3s';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

function updateAllSelects() {
    // Mettre à jour tous les selects de classes
    const classes = dataManager.getClasses();

    // Select pour ajouter un élève
    const selectClass = document.getElementById('selectClass');
    selectClass.innerHTML = '<option value="">-- Choisir une classe --</option>';
    classes.forEach(classe => {
        const option = document.createElement('option');
        option.value = classe.id;
        option.textContent = classe.name;
        selectClass.appendChild(option);
    });

    // Select pour évaluer
    const evalClass = document.getElementById('evalClass');
    evalClass.innerHTML = '<option value="">-- Choisir une classe --</option>';
    classes.forEach(classe => {
        const option = document.createElement('option');
        option.value = classe.id;
        option.textContent = classe.name;
        evalClass.appendChild(option);
    });
}

// ===== INITIALISATION =====

document.addEventListener('DOMContentLoaded', function() {
    updateClassesList();
    updateAllSelects();
    updatePointsDisplay();
});

// Ajouter des animations CSS pour les notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);
