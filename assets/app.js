






    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Utility: Sanitize user input to prevent XSS
    function sanitizeInput(str) {
      if (!str) return '';
      const temp = document.createElement('div');
      temp.textContent = str;
      return temp.innerHTML;
    }

    // Utility: Simple password hashing (SHA-256)
    async function hashPassword(password) {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Utility: Debounce function for performance
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // Debounced save functions
    const debouncedSaveData = debounce(() => {
      try {
        localStorage.setItem('impactCleaningData', JSON.stringify(data));
      } catch (e) {
        console.error('Save error:', e);
        showNotification('Failed to save data. Please try again.', 'error');
      }
    }, 500);

    const debouncedSaveConfig = debounce(() => {
      try {
        localStorage.setItem('impactCleaningConfig', JSON.stringify(config));
      } catch (e) {
        console.error('Config save error:', e);
        showNotification('Failed to save configuration. Please try again.', 'error');
      }
    }, 500);

    // Notification system for better UX
    function showNotification(message, type = 'info') {
      const notification = document.createElement('div');
      notification.className = `fixed top-4 right-4 z-50 ${type === 'error' ? 'error-message' : type === 'success' ? 'success-message' : 'info-message'} shadow-lg`;
      notification.setAttribute('role', 'alert');
      notification.setAttribute('aria-live', 'assertive');
      notification.textContent = message;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease';
        setTimeout(() => notification.remove(), 300);
      }, 4000);
    }

    const DEFAULT_TASK_TEMPLATE = {
      'Monday': {
        'Morning Tasks': ['Example: Clean lobby', 'Example: Wipe down equipment'],
        'Evening Tasks': ['Example: Vacuum floors', 'Example: Empty trash']
      },
      'Tuesday': {
        'Morning Tasks': ['Example: Clean lobby', 'Example: Wipe down equipment'],
        'Evening Tasks': ['Example: Vacuum floors', 'Example: Empty trash']
      },
      'Wednesday': {
        'Morning Tasks': ['Example: Clean lobby', 'Example: Wipe down equipment'],
        'Evening Tasks': ['Example: Vacuum floors', 'Example: Empty trash']
      },
      'Thursday': {
        'Morning Tasks': ['Example: Clean lobby', 'Example: Wipe down equipment'],
        'Evening Tasks': ['Example: Vacuum floors', 'Example: Empty trash']
      },
      'Friday': {
        'Morning Tasks': ['Example: Clean lobby', 'Example: Wipe down equipment'],
        'Evening Tasks': ['Example: Vacuum floors', 'Example: Empty trash']
      },
      'Saturday': {
        'Morning Tasks': ['Example: Clean lobby', 'Example: Wipe down equipment'],
        'Evening Tasks': ['Example: Vacuum floors', 'Example: Empty trash']
      },
      'Sunday': {
        'Morning Tasks': ['Example: Clean lobby', 'Example: Wipe down equipment'],
        'Evening Tasks': ['Example: Vacuum floors', 'Example: Empty trash']
      }
    };

    let state = {
      view: 'setup-check',
      setupStep: 1,
      setupData: {
        clubName: '',
        managerPassword: '',
        employees: [],
        useLangleyTemplate: false,
        securityQuestion: '', // Password recovery
        securityAnswer: ''    // Password recovery
      },
      tempEmployee: '',
      managerView: null,
      managerPassword: '',
      passwordError: '',
      managerTab: 'team',
      editingDay: null,
      tempTasks: {},
      dashboardActiveSection: null,
      currentEmployee: null,
      archiveWeek: null,
      selectedTask: null,
      recoveryStep: 1,
      recoveryAnswer: '',
      newPassword: '',
      confirmPassword: ''
    };

    let config = {
      clubName: '',
      managerPassword: '',
      isSetup: false,
      securityQuestion: '', // Added for password recovery
      securityAnswer: ''     // Added for password recovery
    };

    let data = {
      employees: [],
      tasks: {},
      selected: {},
      completed: {},
      timestamps: {},
      weeklyArchive: {},
      lastDashboardEmployee: null,
      weeklyReportPendingWeekKey: null
    };

    function loadConfig() {
      try {
        const stored = localStorage.getItem('impactCleaningConfig');
        if (stored) config = JSON.parse(stored);
      } catch (e) {
        console.error('Config load error:', e);
        showNotification('Failed to load configuration.', 'error');
      }
    }

    function saveConfig() {
      debouncedSaveConfig();
    }

    function loadData() {
      try {
        const stored = localStorage.getItem('impactCleaningData');
        if (stored) data = JSON.parse(stored);
        if (!data.employees) data.employees = [];
        if (!data.tasks) data.tasks = {};
        if (!data.selected) data.selected = {};
        if (!data.completed) data.completed = {};
        if (!data.timestamps) data.timestamps = {};
        if (!data.weeklyArchive) data.weeklyArchive = {};
        if (!('lastDashboardEmployee' in data)) data.lastDashboardEmployee = null;
        if (!('weeklyReportPendingWeekKey' in data)) data.weeklyReportPendingWeekKey = null;
      } catch (e) {
        console.error('Load error:', e);
        showNotification('Failed to load data.', 'error');
      }
    }

    function saveData() {
      debouncedSaveData();
    }

    function getTodayDay() {
      const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const now = new Date();
      if (now.getHours() < 6) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        return days[yesterday.getDay()];
      }
      return days[now.getDay()];
    }

    function getTimeUntilReset() {
      const now = new Date();
      const tomorrow6am = new Date(now);
      if (now.getHours() >= 6) tomorrow6am.setDate(tomorrow6am.getDate() + 1);
      tomorrow6am.setHours(6, 0, 0, 0);
      const diff = tomorrow6am - now;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours}h ${minutes}m`;
    }

    async function completeSetup() {
      // Validation with user-friendly notifications
      if (!state.setupData.clubName.trim()) { 
        showNotification('Please enter your club name', 'error');
        return; 
      }
      if (!state.setupData.managerPassword.trim()) { 
        showNotification('Please enter a manager password', 'error');
        return; 
      }
      if (state.setupData.managerPassword.length < 6) { 
        showNotification('Password must be at least 6 characters', 'error');
        return; 
      }
      if (!state.setupData.securityQuestion.trim()) { 
        showNotification('Please select a security question', 'error');
        return; 
      }
      if (!state.setupData.securityAnswer.trim()) { 
        showNotification('Please answer the security question', 'error');
        return; 
      }
      
      // Sanitize inputs
      config.clubName = sanitizeInput(state.setupData.clubName.trim());
      
      // Hash password and security answer
      config.managerPassword = await hashPassword(state.setupData.managerPassword);
      config.securityQuestion = sanitizeInput(state.setupData.securityQuestion.trim());
      config.securityAnswer = await hashPassword(state.setupData.securityAnswer.trim().toLowerCase());
      config.isSetup = true;
      saveConfig();

      // Sanitize employee names
      data.employees = state.setupData.employees.map(emp => sanitizeInput(emp));
      data.tasks = state.setupData.useLangleyTemplate ? JSON.parse(JSON.stringify(LANGLEY_TASKS)) : JSON.parse(JSON.stringify(DEFAULT_TASK_TEMPLATE));
      saveData();

      state.view = 'start';
      showNotification('Setup completed successfully!', 'success');
      render();
    }

    function resetSetup() {
      if (confirm('Are you sure you want to reset? All data will be deleted.')) {
        localStorage.removeItem('impactCleaningConfig');
        localStorage.removeItem('impactCleaningData');
        config = { clubName: '', managerPassword: '', isSetup: false };
        data = { employees: [], tasks: {}, selected: {}, completed: {}, timestamps: {}, weeklyArchive: {} };
        state = { view: 'setup-check', setupStep: 1, setupData: { clubName: '', managerPassword: '', employees: [], useLangleyTemplate: false }, tempEmployee: '', managerView: null, managerPassword: '', passwordError: '', managerTab: 'team', editingDay: null, tempTasks: {}, dashboardActiveSection: null, archiveWeek: null };
        render();
      }
    }

    function addEmployeeToSetup() {
      const name = sanitizeInput(state.tempEmployee.trim());
      if (name && !state.setupData.employees.includes(name)) {
        state.setupData.employees.push(name);
        state.tempEmployee = '';
        render();
      }
    }

    function removeEmployeeFromSetup(name) {
      state.setupData.employees = state.setupData.employees.filter(e => e !== name);
      render();
    }

    function checkAndArchive() {
      const now = new Date();
      const currentHour = now.getHours();
      const dayOfWeek = now.getDay();
      if (dayOfWeek === 1 && currentHour >= 6) {
        const weekKey = `${now.getFullYear()}-W${Math.ceil((now - new Date(now.getFullYear(), 0, 1)) / (7 * 24 * 60 * 60 * 1000))}`;
        if (!data.weeklyArchive[weekKey]) {
          data.weeklyArchive[weekKey] = {
            selected: JSON.parse(JSON.stringify(data.selected)),
            completed: JSON.parse(JSON.stringify(data.completed)),
            timestamps: JSON.parse(JSON.stringify(data.timestamps)),
            archivedAt: now.toISOString()
          };
          data.selected = {};
          data.completed = {};
          data.timestamps = {};
          data.weeklyReportPendingWeekKey = weekKey;
          saveData();
          showWeeklyReportToast();
        }
      }
    }

    function formatTime(isoString) {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }

    function exportWeekToCSV() {
      const weekStats = getWeeklyStats();
      let csv = 'Impact Fitness - Weekly Task Report\nClub: ' + config.clubName + '\nGenerated: ' + new Date().toLocaleString() + '\n\n';
      csv += 'Employee,Tasks Selected,Tasks Completed,Completion Rate\n';
      data.employees.forEach(emp => {
        const stats = getEmployeeStats(emp);
        const rate = stats.selected > 0 ? Math.round((stats.completed / stats.selected) * 100) : 0;
        csv += emp + ',' + stats.selected + ',' + stats.completed + ',' + rate + '%\n';
      });
      csv += '\n\nDaily Summary\nDay,Tasks Selected,Tasks Completed,Completion Rate\n';
      DAYS.forEach(day => {
        const stats = weekStats[day];
        const rate = stats.selected > 0 ? Math.round((stats.completed / stats.selected) * 100) : 0;
        csv += day + ',' + stats.selected + ',' + stats.completed + ',' + rate + '%\n';
      });
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      element.setAttribute('download', 'Impact-Fitness-Weekly-Report-' + new Date().toISOString().split('T')[0] + '.csv');
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    function exportArchivedWeekToCSV(weekKey) {
      const archiveData = data.weeklyArchive[weekKey];
      if (!archiveData) return;
      let csv = 'Impact Fitness - Archived Week Report\nClub: ' + config.clubName + '\nWeek: ' + weekKey + '\nArchived: ' + new Date(archiveData.archivedAt).toLocaleString() + '\n\n';
      csv += 'Employee,Tasks Selected,Tasks Completed,Completion Rate\n';
      data.employees.forEach(emp => {
        let selected = 0, completed = 0;
        Object.keys(archiveData.selected).forEach(key => {
          if (key.startsWith(emp + '-')) {
            if (archiveData.selected[key]) selected++;
            if (archiveData.completed[key]) completed++;
          }
        });
        const rate = selected > 0 ? Math.round((completed / selected) * 100) : 0;
        csv += emp + ',' + selected + ',' + completed + ',' + rate + '%\n';
      });
      const element = document.createElement('a');
      element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv));
      element.setAttribute('download', 'Impact-Fitness-Archive-' + weekKey + '.csv');
      element.style.display = 'none';
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }

    async function handleManagerLogin() {
      state.passwordError = '';
      if (!state.managerPassword.trim()) { 
        state.passwordError = 'Password is required'; 
        render(); 
        return; 
      }
      
      const hashedInput = await hashPassword(state.managerPassword);
      if (hashedInput !== config.managerPassword) { 
        state.passwordError = 'Incorrect password'; 
        state.managerPassword = ''; 
        render(); 
        return; 
      }
      
      state.view = 'manager';
      state.managerPassword = '';
      state.managerTab = 'team';
      render();
    }

    function handleManagerLogout() {
      state.view = 'start';
      state.passwordError = '';
      render();
    }

    async function handlePasswordRecovery() {
      state.passwordError = '';
      if (!state.recoveryAnswer.trim()) {
        state.passwordError = 'Please answer the security question';
        render();
        return;
      }
      
      const hashedAnswer = await hashPassword(state.recoveryAnswer.trim().toLowerCase());
      if (hashedAnswer !== config.securityAnswer) {
        state.passwordError = 'Incorrect answer to security question';
        state.recoveryAnswer = '';
        render();
        return;
      }
      // Answer correct, allow password reset
      state.recoveryStep = 2;
      render();
    }

    async function handleSetNewPassword() {
      state.passwordError = '';
      if (!state.newPassword.trim()) {
        state.passwordError = 'Please enter a new password';
        render();
        return;
      }
      if (state.newPassword.length < 6) {
        state.passwordError = 'Password must be at least 6 characters';
        render();
        return;
      }
      if (state.newPassword !== state.confirmPassword) {
        state.passwordError = 'Passwords do not match';
        state.newPassword = '';
        state.confirmPassword = '';
        render();
        return;
      }
      // Password valid, hash and save it
      config.managerPassword = await hashPassword(state.newPassword);
      saveConfig();
      state.view = 'start';
      state.newPassword = '';
      state.confirmPassword = '';
      state.recoveryAnswer = '';
      state.recoveryStep = 1;
      state.passwordError = '';
      showNotification('Password has been reset successfully!', 'success');
      render();
    }

    function bulkAddEmployees(text) {
      const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      const newNames = names.filter(n => !data.employees.includes(n));
      if (newNames.length > 0) {
        data.employees = [...data.employees, ...newNames];
        saveData();
        render();
      }
    }

    function removeEmployee(name) {
      data.employees = data.employees.filter(e => e !== name);
      saveData();
      render();
    }

    
    // Option B Modal Popup Functions
    let currentModalTask = { emp: '', section: '', task: '' };
    let twoPeopleSelection = [];
    
    function showClaimModal(emp, section, task) {
      currentModalTask = { emp, section, task };
      document.getElementById('claimTaskName').textContent = `Who's claiming "${task}"?`;
      
      const container = document.getElementById('claimUserButtons');
      container.innerHTML = '';
      
      data.employees.forEach(employee => {
        const btn = document.createElement('button');
        btn.className = 'user-btn';
        btn.textContent = employee;
        btn.onclick = () => {
          selectTask(employee, section, task);
          hideClaimModal();
        };
        container.appendChild(btn);
      });
      
      document.getElementById('claimModal').style.display = 'flex';
    }

    function hideClaimModal() {
      document.getElementById('claimModal').style.display = 'none';
    }

    function showTwoPeopleClaim() {
      hideClaimModal();
      twoPeopleSelection = [];
      
      const container = document.getElementById('twoPeopleClaimButtons');
      container.innerHTML = '';
      
      data.employees.forEach(emp => {
        const btn = document.createElement('button');
        btn.className = 'user-btn';
        btn.textContent = emp;
        btn.id = `twoclaim-${emp}`;
        btn.onclick = () => toggleTwoSelection(emp, 'claim');
        container.appendChild(btn);
      });
      
      document.getElementById('twoPeopleClaimModal').style.display = 'flex';
      updateTwoConfirmButton();
    }

    function hideTwoClaimModal() {
      document.getElementById('twoPeopleClaimModal').style.display = 'none';
      twoPeopleSelection = [];
    }

    function toggleTwoSelection(employee, type) {
      const idx = twoPeopleSelection.indexOf(employee);
      if (idx > -1) {
        twoPeopleSelection.splice(idx, 1);
      } else if (twoPeopleSelection.length < 2) {
        twoPeopleSelection.push(employee);
      }
      
      data.employees.forEach(emp => {
        const btn = document.getElementById(`twoclaim-${emp}`);
        if (btn) {
          btn.style.background = twoPeopleSelection.includes(emp) ? '#065f46' : '#5b21b6';
        }
      });
      
      updateTwoConfirmButton();
    }

    function updateTwoConfirmButton() {
      const btn = document.getElementById('confirmTwoClaimBtn');
      if (btn) {
        btn.disabled = twoPeopleSelection.length !== 2;
        btn.style.opacity = twoPeopleSelection.length === 2 ? '1' : '0.5';
      }
    }

    function confirmTwoPeopleClaim() {
      if (twoPeopleSelection.length !== 2) return;
      
      twoPeopleSelection.forEach(emp => {
        selectTask(emp, currentModalTask.section, currentModalTask.task);
      });
      
      hideTwoClaimModal();
    }

    function showCompleteModal(emp, section, task) {
      currentModalTask = { emp, section, task };
      document.getElementById('completeTaskName').textContent = `Who's completing "${task}"?`;
      
      const container = document.getElementById('completeUserButtons');
      container.innerHTML = '';
      
      // Only show employees who have claimed this task
      const claimedEmployees = data.employees.filter(employee => {
        return isTaskSelected(employee, section, task);
      });
      
      if (claimedEmployees.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--gray-600); grid-column: 1 / -1;">No one has claimed this task yet</p>';
      } else {
        // If exactly 2 people claimed, show "Both" option
        if (claimedEmployees.length === 2) {
          const bothBtn = document.createElement('button');
          bothBtn.className = 'user-btn';
          bothBtn.textContent = `${claimedEmployees[0]} & ${claimedEmployees[1]}`;
          bothBtn.style.gridColumn = '1 / -1';
          bothBtn.onclick = () => {
            claimedEmployees.forEach(employee => {
              completeTask(employee, section, task);
            });
            hideCompleteModal();
          };
          container.appendChild(bothBtn);
        }
        
        // Individual buttons
        claimedEmployees.forEach(employee => {
          const btn = document.createElement('button');
          btn.className = 'user-btn';
          btn.textContent = employee;
          btn.onclick = () => {
            completeTask(employee, section, task);
            hideCompleteModal();
          };
          container.appendChild(btn);
        });
      }
      
      document.getElementById('completeModal').style.display = 'flex';
    }

    function hideCompleteModal() {
      document.getElementById('completeModal').style.display = 'none';
    }

    // Close modals when clicking outside
    window.onclick = function(event) {
      if (event.target.classList.contains('claim-modal')) {
        hideClaimModal();
        hideCompleteModal();
        hideTwoClaimModal();
      }
    }

    function selectTask(emp, section, task) {
      const today = getTodayDay();
      const key = emp + '-' + today + '-' + section + '-' + task;
      data.selected[key] = !data.selected[key];
      if (!data.selected[key]) {
        delete data.completed[key];
        delete data.timestamps[key];
      }
      saveData();
      render();
    }

    function completeTask(emp, section, task) {
      const today = getTodayDay();
      const key = emp + '-' + today + '-' + section + '-' + task;
      data.completed[key] = true;
      data.timestamps[key] = new Date().toISOString();
      saveData();
      render();
    }

    

    function handleDashboardEmployeeChange(emp) {
      state.currentEmployee = emp || null;
      data.lastDashboardEmployee = state.currentEmployee;
      saveData();
      render();
    }

    function claimCurrentTask() {
      const emp = state.currentEmployee;
      if (!emp) {
        showNotification('Please select an employee first.', 'error');
        return;
      }
      if (!state.selectedTask) {
        showNotification('Please select a task from the left.', 'error');
        return;
      }
      try {
        const t = JSON.parse(state.selectedTask);
        selectTask(emp, t.section, t.name);
      } catch (e) {
        console.error('Invalid selectedTask state', e);
      }
    }

    function completeCurrentTask() {
      const emp = state.currentEmployee;
      if (!emp) {
        showNotification('Please select an employee first.', 'error');
        return;
      }
      if (!state.selectedTask) {
        showNotification('Please select a task from the left.', 'error');
        return;
      }
      try {
        const t = JSON.parse(state.selectedTask);
        if (!isTaskSelected(emp, t.section, t.name)) {
          showNotification('Please claim the task before completing it.', 'error');
          return;
        }
        completeTask(emp, t.section, t.name);
      } catch (e) {
        console.error('Invalid selectedTask state', e);
      }
    }



    function showWeeklyReportToast() {
      const toast = document.getElementById('weeklyReportToast');
      if (!toast) return;
      if (data.weeklyReportPendingWeekKey) {
        toast.style.display = 'block';
      } else {
        toast.style.display = 'none';
      }
    }

    function hideWeeklyReportToast() {
      const toast = document.getElementById('weeklyReportToast');
      if (!toast) return;
      toast.style.display = 'none';
    }

    async function generateWeeklyReportPDF(weekKey, archiveData) {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

      const clubName = (window.config && window.config.clubName) || 'Impact Fitness Club';
      const generatedAt = new Date().toLocaleString();

      // Header
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Impact Fitness – Weekly Cleaning Report', 14, 18);

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.text(`Club: ${clubName}`, 14, 26);
      doc.text(`Week: ${weekKey}`, 14, 32);
      doc.text(`Generated: ${generatedAt}`, 14, 38);

      let currentY = 44;

      // Employee summary
      const employees = (data.employees || []).slice();
      const employeeRows = employees.map(emp => {
        let selected = 0;
        let completed = 0;

        const selectedMap = archiveData.selected || {};
        const completedMap = archiveData.completed || {};

        Object.keys(selectedMap).forEach(key => {
          if (key.startsWith(emp + '-')) {
            if (selectedMap[key]) selected++;
            if (completedMap[key]) completed++;
          }
        });

        const rate = selected > 0 ? Math.round((completed / selected) * 100) + '%' : '0%';
        return [emp, String(selected), String(completed), rate];
      });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Summary', 14, currentY);
      currentY += 4;

      doc.autoTable({
        startY: currentY,
        head: [['Employee', 'Tasks Selected', 'Tasks Completed', 'Completion Rate']],
        body: employeeRows,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [109, 40, 217] }
      });

      currentY = doc.lastAutoTable.finalY + 10;

      // Daily summary
      const DAYS_LOCAL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
      const dailyRows = [];

      DAYS_LOCAL.forEach(day => {
        let selected = 0;
        let completed = 0;
        const selectedMap = archiveData.selected || {};
        const completedMap = archiveData.completed || {};

        Object.keys(selectedMap).forEach(key => {
          if (key.includes('-' + day + '-')) {
            if (selectedMap[key]) selected++;
            if (completedMap[key]) completed++;
          }
        });

        const rate = selected > 0 ? Math.round((completed / selected) * 100) + '%' : '0%';
        dailyRows.push([day, String(selected), String(completed), rate]);
      });

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Daily Summary', 14, currentY);
      currentY += 4;

      doc.autoTable({
        startY: currentY,
        head: [['Day', 'Tasks Selected', 'Tasks Completed', 'Completion Rate']],
        body: dailyRows,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [109, 40, 217] }
      });

      const pdfBytes = doc.output('arraybuffer');
      return new Blob([pdfBytes], { type: 'application/pdf' });
    }

    async function handleWeeklyReportToastClick() {
      if (!data.weeklyReportPendingWeekKey) {
        showNotification('No weekly report pending.', 'info');
        hideWeeklyReportToast();
        return;
      }

      const weekKey = data.weeklyReportPendingWeekKey;
      const archiveData = (data.weeklyArchive && data.weeklyArchive[weekKey]) || null;

      if (!archiveData) {
        showNotification('No archived data found for this week.', 'error');
        data.weeklyReportPendingWeekKey = null;
        saveData();
        hideWeeklyReportToast();
        return;
      }

      try {
        const pdfBlob = await generateWeeklyReportPDF(weekKey, archiveData);

        if (window.showSaveFilePicker) {
          let saved = false;
          while (!saved) {
            try {
              const handle = await window.showSaveFilePicker({
                suggestedName: `ImpactFitness_${(config && config.clubName) || 'Club'}_${weekKey}.pdf`,
                types: [{
                  description: 'PDF Report',
                  accept: { 'application/pdf': ['.pdf'] }
                }]
              });

              const writable = await handle.createWritable();
              await writable.write(pdfBlob);
              await writable.close();
              saved = true;
            } catch (err) {
              // User cancelled – keep toast and allow retry later
              showNotification('Weekly report not saved. Click the banner again when ready.', 'info');
              return;
            }
          }

          data.weeklyReportPendingWeekKey = null;
          saveData();
          hideWeeklyReportToast();
          showNotification('Weekly PDF report saved successfully.', 'success');
        } else {
          // Fallback: download via link
          const url = URL.createObjectURL(pdfBlob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ImpactFitness_${(config && config.clubName) || 'Club'}_${weekKey}.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          data.weeklyReportPendingWeekKey = null;
          saveData();
          hideWeeklyReportToast();
          showNotification('Weekly PDF report downloaded.', 'success');
        }
      } catch (err) {
        console.error('Error generating or saving weekly PDF', err);
        showNotification('Error generating weekly PDF report.', 'error');
      }
    }

function isTaskSelected(emp, section, task) {
      const today = getTodayDay();
      const key = emp + '-' + today + '-' + section + '-' + task;
      return data.selected[key] || false;
    }

    function isTaskCompleted(emp, section, task) {
      const today = getTodayDay();
      const key = emp + '-' + today + '-' + section + '-' + task;
      return data.completed[key] || false;
    }

    function getTaskTimestamp(emp, section, task) {
      const today = getTodayDay();
      const key = emp + '-' + today + '-' + section + '-' + task;
      return data.timestamps[key] || null;
    }

    function getEmployeeStats(emp) {
      const today = getTodayDay();
      let selected = 0, completed = 0;
      const tasks = data.tasks[today] || {};
      Object.entries(tasks).forEach(([section, sectionTasks]) => {
        sectionTasks.forEach(task => {
          if (isTaskSelected(emp, section, task)) {
            selected++;
            if (isTaskCompleted(emp, section, task)) completed++;
          }
        });
      });
      return { selected, completed };
    }

    function editDay(day) {
      state.editingDay = day;
      state.tempTasks = JSON.parse(JSON.stringify(data.tasks[day] || {}));
      render();
    }

    function saveDayTasks() {
      data.tasks[state.editingDay] = JSON.parse(JSON.stringify(state.tempTasks));
      state.editingDay = null;
      saveData();
      render();
    }

    function addSection() {
      const sectionName = prompt('Enter section name (e.g., "Morning Tasks", "Evening Tasks"):');
      if (sectionName && sectionName.trim() && !state.tempTasks[sectionName.trim()]) {
        state.tempTasks[sectionName.trim()] = [''];
        render();
      }
    }

    function addTaskToSection(section) {
      if (!state.tempTasks[section]) state.tempTasks[section] = [];
      state.tempTasks[section].push('');
      render();
    }

    function updateTask(section, idx, value) {
      state.tempTasks[section][idx] = value;
    }

    function deleteTask(section, idx) {
      state.tempTasks[section].splice(idx, 1);
      if (state.tempTasks[section].length === 0) delete state.tempTasks[section];
      render();
    }

    function getDashboardStats() {
      let totalSelected = 0, totalCompleted = 0;
      Object.keys(data.selected).forEach(key => {
        if (data.selected[key]) totalSelected++;
        if (data.completed[key]) totalCompleted++;
      });
      return { totalSelected, totalCompleted };
    }

    function getWeeklyStats() {
      const stats = {};
      DAYS.forEach(day => {
        let dayCompleted = 0, daySelected = 0;
        Object.keys(data.selected).forEach(key => {
          if (key.includes('-' + day + '-')) {
            if (data.selected[key]) daySelected++;
            if (data.completed[key]) dayCompleted++;
          }
        });
        stats[day] = { selected: daySelected, completed: dayCompleted };
      });
      return stats;
    }

    const LANGLEY_TASKS = {
      'Monday': {
        'Staff Room Tasks': ['Throw out and change trash in garbage can', 'Wipe & organize tables and surfaces', 'Clean inside microwave', 'Clean toaster', 'Clean inside fridge', 'Clean + fill coffee machine', 'Sweep/vacuum the floor'],
        'Morning Tasks': ['Mirrors (SPA) - use water and paper towel', 'DUST & WIPE Cable Towers', 'DUST & WIPE 30 Minute Steppers X10', 'Ledges & Water fountain', 'Lobby tables & chairs', 'Glass doors', 'Cooler re-stock and wipe down', 'LOBBY Vacuum/Mop', 'AED Wipedown & Dust Clocks', 'FLOOR WALK', 'Garbage - Out to bin'],
        'Evening Tasks': ['DUST & WIPE 30 minute strength machines X10', 'DUST & WIPE Barbell stand', 'DUST & WIPE Dumbbell stands X3', 'Ledges and water fountain', 'Lobby tables & chairs', 'LOBBY Vacuum/mop', 'Glass doors', 'Garbage - Out to bin', 'FLOOR WALK', 'Last Cart check & Bathroom Check'],
        'Overnight Tasks': ['Change garbages', 'LOBBY Vacuum/Mop', 'BCSPA Vacuum/Mop', 'MEN\'S LOCKER ROOMS Vacuum/Mop', 'WOMEN\'S LOCKER ROOMS Vacuum/Mop', 'DEEP CLEAN Showers', 'VACUUM/MOP 30 mins area', 'VACUUM/MOP Strength Machine Area', 'FLOOR WALK', 'Last Cart check & Bathroom Check']
      },
      'Tuesday': {
        'Staff Room Tasks': ['Throw out and change trash', 'Wipe & organize tables', 'Clean microwave', 'Clean toaster', 'Clean fridge', 'Clean + fill coffee machine', 'Sweep/vacuum floor', 'Mop floor'],
        'Morning Tasks': ['DUST & WIPE Smith Machines', 'DUST & WIPE Leg press/Bench press', 'DUST & WIPE Functional training machines', 'Ledges & Water fountain', 'Lobby tables & chairs', 'Garbage - Out to bin', 'LOBBY Vacuum/Mop', 'FLOOR WALK'],
        'Evening Tasks': ['Mirrors (Floor)', 'DUST & WIPE mat holders', 'DUST & WIPE smaller dumbbell stands', 'DUST & WIPE Plate trees', 'Ledges and water fountain', 'Lobby tables & chairs', 'LOBBY Vacuum/Mop', 'FLOOR WALK', 'Mirrors (spa)', 'Glass doors', 'Garbage - Out to bin'],
        'Overnight Tasks': ['Change garbages', 'LOBBY Vacuum/Mop', 'BCSPA Vacuum/Mop', 'MEN\'S LOCKER ROOMS Vacuum/Mop', 'WOMEN\'S LOCKER ROOMS Vacuum/Mop', 'DEEP CLEAN Hand Dryer Area', 'VACUUM/MOP Cable Towers area', 'FLOOR WALK']
      },
      'Wednesday': {
        'Staff Room Tasks': ['Throw out and change trash', 'Wipe tables', 'Clean microwave', 'Clean toaster', 'Clean fridge', 'Coffee machine', 'Sweep/vacuum', 'Mop floor'],
        'Morning Tasks': ['Garbage - Out to bin', 'FLOOR WALK', 'DUST & WIPE 30 minute strength machines', 'Mirrors (spa)', 'Ledges & Water fountain', 'Lobby tables & chairs', 'Glass doors', 'LOBBY Vacuum/Mop', 'Mirrors - Womens', 'Mirrors - Mens'],
        'Evening Tasks': ['DUST & WIPE Cable Towers', 'DUST & WIPE 30 minute steppers', 'DUST & WIPE barbell & dumbbell stands', 'DUST & WIPE Benches', 'FLOOR WALK', 'Ledges and water fountain', 'Lobby tables & chairs', 'LOBBY Vacuum/mop', 'Glass doors', 'Garbage - Out to bin'],
        'Overnight Tasks': ['Change garbages', 'LOBBY Vacuum/Mop', 'BCSPA Vacuum/Mop', 'MEN\'S LOCKER ROOMS Vacuum/Mop', 'WOMEN\'S LOCKER ROOMS Vacuum/Mop', 'DEEP CLEAN Toilet and Stall', 'VACUUM/MOP Functional Area', 'FLOOR WALK']
      },
      'Thursday': {
        'Staff Room Tasks': ['Trash', 'Wipe tables', 'Clean microwave', 'Clean toaster', 'Clean fridge', 'Coffee machine', 'Sweep/vacuum', 'Mop'],
        'Morning Tasks': ['Garbage - Out to bin', 'Mirrors (floor)', 'DUST & WIPE Smith Machines', 'DUST & WIPE Dip Machine', 'Lobby tables', 'FLOOR WALK', 'Glass doors', 'Ledges + water fountain', 'LOBBY Vacuum'],
        'Evening Tasks': ['DUST & WIPE Mat Holders', 'DUST & WIPE smaller dumbbell stands', 'DUST & WIPE Synergy 360+TRX', 'DUST & WIPE Plate trees', 'FLOOR WALK', 'Ledges and water fountain', 'Lobby tables & chairs', 'LOBBY Vacuum/Mop', 'Glass doors', 'Garbage - Out to bin'],
        'Overnight Tasks': ['Change garbages', 'LOBBY Vacuum/Mop', 'BCSPA Vacuum/Mop', 'MEN\'S LOCKER ROOMS Vacuum/Mop', 'WOMEN\'S LOCKER ROOMS Vacuum/Mop', 'Vacuum and mop areas', 'FLOOR WALK']
      },
      'Friday': {
        'Staff Room Tasks': ['Trash', 'Wipe tables', 'Microwave', 'Toaster', 'Fridge', 'Coffee', 'Sweep', 'Mop'],
        'Morning Tasks': ['Garbage - Out to bin', 'DUST & WIPE BENCHES', 'DUST & WIPE Cable Towers', 'DUST & WIPE Steppers', 'Mirrors (Spa)', 'Lobby tables', 'Glass doors', 'Ledges + water fountain', 'LOBBY Vacuum/Mop', 'FLOOR WALK'],
        'Evening Tasks': ['DUST & WIPE dumbbell stands', 'DUST & WIPE Accessory tree', 'DUST & WIPE Dumbbell/Barbell stands', 'DUST & WIPE strength machines', 'Ledges and water fountain', 'Mirrors - Womens/Mens', 'Lobby tables', 'LOBBY Vacuum/Mop', 'FLOOR WALK', 'Glass doors', 'Garbage'],
        'Overnight Tasks': ['Change garbages', 'LOBBY Vacuum/Mop', 'BCSPA Vacuum/Mop', 'LOCKER ROOMS Vacuum/Mop', 'Dust fans', 'Vacuum areas', 'FLOOR WALK']
      },
      'Saturday': {
        'Staff Room Tasks': ['Trash', 'Tables', 'Microwave', 'Toaster', 'Fridge', 'Coffee', 'Sweep', 'Mop'],
        'Morning Tasks': ['Garbage', 'DUST & WIPE Plate trees', 'DUST & WIPE Leg press/hack squat', 'DUST & WIPE Functional machines', 'Lobby tables', 'Glass doors', 'Ledges + water fountain', 'LOBBY Vacuum/Mop', 'FLOOR WALK'],
        'Evening Tasks': ['DUST & WIPE Synergy 360', 'DUST & WIPE Dip Machine', 'DUST & WIPE cooler & AED', 'DUST & WIPE Strength machines', 'FLOOR WALK', 'Ledges and water fountain', 'Lobby tables', 'LOBBY Vacuum/Mop', 'Mirrors (SPA)', 'Glass doors', 'Garbage'],
        'Overnight Tasks': ['Change garbages', 'LOBBY Vacuum/Mop', 'BCSPA Vacuum/Mop', 'LOCKER ROOMS Vacuum/Mop', 'FLOOR WALK']
      },
      'Sunday': {
        'Staff Room Tasks': ['Trash', 'Tables', 'Microwave', 'Toaster', 'Fridge', 'Coffee', 'Sweep', 'Mop'],
        'Morning Tasks': ['Lobby Tables', 'DUST tops of lockers', 'Mirrors (Floor)', 'DUST & WIPE Smith Machines', 'DUST & WIPE dumbbell stands', 'DUST & WIPE Synergy 360', 'DUST & WIPE Dip Machine', 'Ledges & Water fountain', 'LOBBY Vacuum/Mop', 'FLOOR WALK', 'Glass doors', 'Garbage'],
        'Evening Tasks': ['DUST & WIPE Mat holders', 'DUST & WIPE Plate tree stands', 'DUST & WIPE Leg Press', 'DUST & WIPE Functional machines', 'Ledges and water fountain', 'Lobby tables', 'FLOOR WALK', 'LOBBY Clean behind desk', 'Mirrors (SPA)', 'Glass doors', 'Garbage'],
        'Overnight Tasks': ['Change garbages', 'LOBBY Vacuum/Mop', 'BCSPA Vacuum/Mop', 'LOCKER ROOMS Vacuum/Mop', 'DEEP CLEAN Showers', 'DEEP CLEAN MACHINES', 'GARBAGE', 'FLOOR WALK']
      }
    };

    function render() {
      const app = document.getElementById('app');
      const todayDay = getTodayDay();
      const timeUntilReset = getTimeUntilReset();
      const dashStats = getDashboardStats();
      const weeklyStats = getWeeklyStats();
      
      if (state.view === 'setup-check') {
        if (config.isSetup) {
          state.view = 'start';
          render();
          return;
        }
        state.view = 'setup';
        render();
        return;
      }

      if (state.view === 'setup') {
        app.innerHTML = `
          <div class="min-h-screen gradient-primary p-6">
            <div class="max-w-4xl mx-auto">
              <div class="card p-8 mb-6" role="main">
                <div class="text-center mb-8">
                  <h1 id="setup-heading" class="text-4xl font-bold text-gray-900 mb-2">Impact Fitness Setup</h1>
                  <p class="text-gray-600">Let's configure your cleaning task manager</p>
                </div>
                <form role="form" aria-labelledby="setup-heading" onsubmit="event.preventDefault(); completeSetup();">
                  <div class="setup-step ${state.setupData.clubName ? 'completed' : ''}" role="region" aria-label="Step 1: Club Information">
                    <div class="flex items-start">
                      <span class="step-number ${state.setupData.clubName ? 'completed' : ''}" aria-hidden="true">1</span>
                      <div class="flex-1">
                        <h3 class="font-bold text-gray-900 mb-2">Club Information</h3>
                        <p class="text-sm text-gray-600 mb-4">What's the name of your club location?</p>
                        <label for="clubName" class="sr-only">Club Name</label>
                        <input 
                          type="text" 
                          id="clubName"
                          name="clubName"
                          value="${state.setupData.clubName}" 
                          onchange="state.setupData.clubName = this.value; render();" 
                          placeholder="e.g., Langley, Coquitlam, North Vancouver" 
                          class="w-full px-4 py-2 bg-white"
                          aria-describedby="clubName-desc"
                          required
                        />
                        <span id="clubName-desc" class="sr-only">Enter your club location name</span>
                        ${state.setupData.clubName ? `<div class="success-message mt-3" role="status" aria-live="polite"><span class="success-icon"></span> Club name: <strong>${sanitizeInput(state.setupData.clubName)}</strong></div>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="setup-step ${state.setupData.managerPassword ? 'completed' : ''}" role="region" aria-label="Step 2: Manager Password">
                    <div class="flex items-start">
                      <span class="step-number ${state.setupData.managerPassword ? 'completed' : ''}" aria-hidden="true">2</span>
                      <div class="flex-1">
                        <h3 class="font-bold text-gray-900 mb-2">Manager Password</h3>
                        <p class="text-sm text-gray-600 mb-4">Set a password for manager access (minimum 6 characters)</p>
                        <label for="managerPassword" class="sr-only">Manager Password</label>
                        <input 
                          type="password" 
                          id="managerPassword"
                          name="managerPassword"
                          value="${state.setupData.managerPassword}" 
                          onchange="state.setupData.managerPassword = this.value; render();" 
                          placeholder="Enter password" 
                          class="w-full px-4 py-2 bg-white"
                          minlength="6"
                          aria-describedby="password-requirements"
                          autocomplete="new-password"
                          required
                        />
                        <span id="password-requirements" class="sr-only">Password must be at least 6 characters long</span>
                        ${state.setupData.managerPassword ? `<div class="success-message mt-3" role="status" aria-live="polite"><span class="success-icon"></span> Password set (${state.setupData.managerPassword.length} characters)</div>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="setup-step ${state.setupData.securityAnswer ? 'completed' : ''}" role="region" aria-label="Step 2b: Security Question">
                    <div class="flex items-start">
                      <span class="step-number ${state.setupData.securityAnswer ? 'completed' : ''}" aria-hidden="true">2b</span>
                      <div class="flex-1">
                        <h3 class="font-bold text-gray-900 mb-2">Security Question (Password Recovery)</h3>
                        <p class="text-sm text-gray-600 mb-4">Set a security question in case you forget your password</p>
                        <div class="mb-3">
                          <label for="securityQuestion" class="block text-sm font-medium text-gray-700 mb-2">Select a Question:</label>
                          <select 
                            id="securityQuestion"
                            name="securityQuestion"
                            onchange="state.setupData.securityQuestion = this.value; render();" 
                            class="w-full px-4 py-2 bg-white"
                            aria-required="true"
                          >
                            <option value="" disabled ${!state.setupData.securityQuestion ? 'selected' : ''}>-- Choose a security question --</option>
                            <option value="What is your favorite color?" ${state.setupData.securityQuestion === "What is your favorite color?" ? 'selected' : ''}>What is your favorite color?</option>
                            <option value="What is your pet's name?" ${state.setupData.securityQuestion === "What is your pet's name?" ? 'selected' : ''}>What is your pet's name?</option>
                            <option value="What city were you born in?" ${state.setupData.securityQuestion === "What city were you born in?" ? 'selected' : ''}>What city were you born in?</option>
                            <option value="What is your mother's maiden name?" ${state.setupData.securityQuestion === "What is your mother's maiden name?" ? 'selected' : ''}>What is your mother's maiden name?</option>
                            <option value="What is your favorite food?" ${state.setupData.securityQuestion === "What is your favorite food?" ? 'selected' : ''}>What is your favorite food?</option>
                            <option value="What year did you start working at Impact Fitness?" ${state.setupData.securityQuestion === "What year did you start working at Impact Fitness?" ? 'selected' : ''}>What year did you start at Impact Fitness?</option>
                          </select>
                        </div>
                        ${state.setupData.securityQuestion ? `
                          <div>
                            <label for="securityAnswer" class="block text-sm font-medium text-gray-700 mb-2">Your Answer:</label>
                            <input 
                              type="text" 
                              id="securityAnswer"
                              name="securityAnswer"
                              value="${state.setupData.securityAnswer}" 
                              onchange="state.setupData.securityAnswer = this.value; render();" 
                              placeholder="Answer (case-insensitive)" 
                              class="w-full px-4 py-2 bg-white"
                              aria-describedby="answer-hint"
                              required
                            />
                            <span id="answer-hint" class="sr-only">Your answer is case-insensitive</span>
                          </div>
                        ` : ''}
                        ${state.setupData.securityAnswer ? `<div class="success-message mt-3" role="status" aria-live="polite"><span class="success-icon"></span> Security question set</div>` : ''}
                      </div>
                    </div>
                  </div>
                  <div class="setup-step ${state.setupData.employees.length > 0 ? 'completed' : ''}" role="region" aria-label="Step 3: Team Members">
                    <div class="flex items-start">
                      <span class="step-number ${state.setupData.employees.length > 0 ? 'completed' : ''}" aria-hidden="true">3</span>
                      <div class="flex-1">
                        <h3 class="font-bold text-gray-900 mb-2">Team Members (Optional)</h3>
                        <p class="text-sm text-gray-600 mb-4">Add employee names now, or add them later</p>
                        ${state.setupData.employees.length > 0 ? `
                          <div class="preview-box mb-4" role="region" aria-label="Current team members">
                            <p class="text-xs font-semibold text-gray-600 mb-2">Team (${state.setupData.employees.length})</p>
                            <div class="space-y-2">
                              ${state.setupData.employees.map(emp => `
                                <div class="flex items-center justify-between bg-white p-2 rounded">
                                  <span class="text-sm font-medium">${sanitizeInput(emp)}</span>
                                  <button 
                                    type="button"
                                    onclick="removeEmployeeFromSetup('${emp.replace(/'/g, "\\'")}');" 
                                    class="text-red-500 hover:text-red-700"
                                    aria-label="Remove ${sanitizeInput(emp)}"
                                  >
                                    ×
                                  </button>
                                </div>
                              `).join('')}
                            </div>
                          </div>
                        ` : ''}
                        <div class="flex gap-2">
                          <label for="employeeName" class="sr-only">Employee Name</label>
                          <input 
                            type="text" 
                            id="employeeName"
                            value="${state.tempEmployee}" 
                            onchange="state.tempEmployee = this.value;" 
                            onkeypress="if(event.key==='Enter') { event.preventDefault(); addEmployeeToSetup(); }" 
                            placeholder="e.g., John Smith" 
                            class="flex-1 px-4 py-2 bg-white"
                          />
                          <button 
                            type="button"
                            onclick="addEmployeeToSetup();" 
                            class="btn-primary text-white px-6 py-2 rounded-lg"
                            aria-label="Add employee"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="setup-step" role="region" aria-label="Step 4: Task Template">
                    <div class="flex items-start">
                      <span class="step-number" aria-hidden="true">4</span>
                      <div class="flex-1">
                        <h3 class="font-bold text-gray-900 mb-2">Task Template</h3>
                        <p class="text-sm text-gray-600 mb-4">Choose your starting task template</p>
                        <div class="space-y-3" role="radiogroup" aria-label="Task template selection">
                          <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${!state.setupData.useLangleyTemplate ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}">
                            <input 
                              type="radio" 
                              name="template" 
                              ${!state.setupData.useLangleyTemplate ? 'checked' : ''} 
                              onchange="state.setupData.useLangleyTemplate = false; render();" 
                              class="mt-1"
                              aria-label="Basic template"
                            />
                            <div class="ml-3">
                              <div class="font-semibold text-gray-900">Start with Basic Template</div>
                              <div class="text-sm text-gray-600">Simple example tasks you can customize</div>
                            </div>
                          </label>
                          <label class="flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${state.setupData.useLangleyTemplate ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}">
                            <input 
                              type="radio" 
                              name="template" 
                              ${state.setupData.useLangleyTemplate ? 'checked' : ''} 
                              onchange="state.setupData.useLangleyTemplate = true; render();" 
                              class="mt-1"
                              aria-label="Pre-configured template"
                            />
                            <div class="ml-3">
                              <div class="font-semibold text-gray-900">Use Pre-configured Template</div>
                              <div class="text-sm text-gray-600">Pre-configured with comprehensive cleaning tasks</div>
                            </div>
                          </label>
                        </div>
                        <div class="info-message mt-4" role="note"><strong>Note:</strong> You can customize all tasks in the Manager Portal after setup</div>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="submit" 
                    class="btn-success w-full font-semibold py-4 text-lg rounded-lg mt-6"
                    aria-label="Complete setup and launch application"
                  >
                    Complete Setup & Launch
                  </button>
                </form>
              </div>
            </div>
          </div>
        `;
        return;
      }

      if (state.view === 'start') {
        app.innerHTML = `
          <div class="min-h-screen gradient-primary flex items-center justify-center p-4">
            <main role="main" class="card w-full max-w-md p-8">
              <header class="text-center mb-8">
                <h1 class="text-4xl font-bold text-gray-900 mb-2">Impact Fitness</h1>
                <p class="text-xl font-semibold text-purple-600">${config.clubName}</p>
                <p class="text-gray-600 text-sm mt-2">Cleaning Task Management</p>
              </header>
              <nav role="navigation" aria-label="Main navigation" class="space-y-3">
                <button 
                  onclick="state.view = 'dashboard'; checkAndArchive(); render();" 
                  class="btn-primary w-full text-white font-semibold py-3 rounded-lg"
                  aria-label="Open employee dashboard"
                >
                  Employee Dashboard
                </button>
                <button 
                  onclick="state.view = 'manager-login'; state.passwordError = ''; render();" 
                  class="btn-primary w-full text-white font-semibold py-3 rounded-lg"
                  aria-label="Open manager portal"
                >
                  Manager Portal
                </button>
                <button 
                  onclick="resetSetup();" 
                  class="btn-secondary w-full font-semibold py-3 rounded-lg"
                  aria-label="Reset installation"
                >
                  Reset Installation
                </button>
              </nav>
            </main>
          </div>
        `;
      } else if (state.view === 'manager-login') {
        app.innerHTML = `
          <div class="min-h-screen gradient-primary flex items-center justify-center p-4">
            <main role="main" class="card w-full max-w-md p-8">
              <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-1">Manager Login</h1>
                <p class="text-purple-600 font-semibold">${config.clubName}</p>
              </div>
              ${state.passwordError ? `<div class="error-message mb-6" role="alert" aria-live="assertive">${state.passwordError}</div>` : ''}
              <form onsubmit="event.preventDefault(); handleManagerLogin();" role="form" aria-label="Manager login form">
                <div class="space-y-5 mb-6">
                  <div>
                    <label for="mgr-pwd" class="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                    <input 
                      type="password" 
                      id="mgr-pwd" 
                      name="password"
                      onchange="state.managerPassword = this.value;" 
                      class="w-full px-4 py-2 bg-gray-50" 
                      placeholder="Enter your password"
                      autocomplete="current-password"
                      required
                      aria-required="true"
                    />
                  </div>
                </div>
                <div class="space-y-3">
                  <button 
                    type="submit" 
                    class="btn-primary w-full text-white font-semibold py-2 rounded-lg"
                  >
                    Access Manager Portal
                  </button>
                  <button 
                    type="button"
                    onclick="state.view = 'password-recovery'; state.managerPassword = ''; state.passwordError = ''; state.recoveryStep = 1; render();" 
                    class="btn-secondary w-full font-semibold py-2 rounded-lg"
                  >
                    Forgot Password?
                  </button>
                  <button 
                    type="button"
                    onclick="state.view = 'start'; state.managerPassword = ''; state.passwordError = ''; render();" 
                    class="btn-secondary w-full font-semibold py-2 rounded-lg"
                  >
                    Back to Menu
                  </button>
                </div>
              </form>
            </main>
          </div>
        `;
        setTimeout(() => { const input = document.getElementById('mgr-pwd'); if (input) input.focus(); }, 100);
      } else if (state.view === 'password-recovery') {
        app.innerHTML = `
          <div class="min-h-screen gradient-primary flex items-center justify-center p-4">
            <div class="card w-full max-w-md p-8">
              <div class="text-center mb-8">
                <h1 class="text-3xl font-bold text-gray-900 mb-1">Reset Password</h1>
                <p class="text-purple-600 font-semibold">${config.clubName}</p>
              </div>
              ${state.passwordError ? `<div class="error-message mb-6">${state.passwordError}</div>` : ''}
              
              ${state.recoveryStep === 1 ? `
                <div class="space-y-5 mb-6">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-3">${config.securityQuestion}</label>
                    <input type="text" value="${state.recoveryAnswer}" onchange="state.recoveryAnswer = this.value;" onkeydown="if(event.key==='Enter') handlePasswordRecovery();" class="w-full px-4 py-2 bg-gray-50" placeholder="Your answer" />
                  </div>
                </div>
                <div class="space-y-3">
                  <button onclick="handlePasswordRecovery();" class="btn-primary w-full text-white font-semibold py-2 rounded-lg">Verify Answer</button>
                  <button onclick="state.view = 'manager-login'; state.recoveryAnswer = ''; state.passwordError = ''; state.recoveryStep = 1; render();" class="btn-secondary w-full font-semibold py-2 rounded-lg">Back to Login</button>
                </div>
              ` : `
                <div class="space-y-5 mb-6">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">New Password</label>
                    <input type="password" value="${state.newPassword}" onchange="state.newPassword = this.value;" placeholder="••••••••" class="w-full px-4 py-2 bg-gray-50" />
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-2">Confirm Password</label>
                    <input type="password" value="${state.confirmPassword}" onchange="state.confirmPassword = this.value;" onkeydown="if(event.key==='Enter') handleSetNewPassword();" placeholder="••••••••" class="w-full px-4 py-2 bg-gray-50" />
                  </div>
                </div>
                <div class="space-y-3">
                  <button onclick="handleSetNewPassword();" class="btn-success w-full text-white font-semibold py-2 rounded-lg">Reset Password</button>
                  <button onclick="state.view = 'manager-login'; state.newPassword = ''; state.confirmPassword = ''; state.recoveryAnswer = ''; state.passwordError = ''; state.recoveryStep = 1; render();" class="btn-secondary w-full font-semibold py-2 rounded-lg">Back to Login</button>
                </div>
              `}
            </div>
          </div>
        `;
      } else if (state.view === 'manager') {
        app.innerHTML = `
          <div class="min-h-screen bg-gray-50">
            <div class="gradient-primary text-white p-6 shadow-lg">
              <div class="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h1 class="text-3xl font-bold">Manager Portal</h1>
                  <p class="text-purple-200 text-sm mt-1">${config.clubName}</p>
                </div>
                <button onclick="handleManagerLogout();" class="btn-danger text-white font-semibold px-6 py-2 rounded-lg">Log Out</button>
              </div>
            </div>
            <div class="max-w-7xl mx-auto p-6">
              <div class="flex gap-2 mb-6">
                <button onclick="state.managerTab = 'team'; render();" class="dashboard-tab ${state.managerTab === 'team' ? 'active' : 'inactive'}"> Team</button>
                <button onclick="state.managerTab = 'tasks'; render();" class="dashboard-tab ${state.managerTab === 'tasks' ? 'active' : 'inactive'}"> Tasks</button>
                <button onclick="state.managerTab = 'dashboard'; render();" class="dashboard-tab ${state.managerTab === 'dashboard' ? 'active' : 'inactive'}"> Dashboard</button>
              </div>
              ${state.managerTab === 'team' ? `
                <div class="card p-6">
                  <h2 class="text-xl font-bold text-gray-900 mb-6">Team Management</h2>
                  <div class="mb-8">
                    <p class="text-sm font-semibold text-gray-600 mb-4">Employees (${data.employees.length})</p>
                    <div class="space-y-2 max-h-64 overflow-y-auto mb-4">
                      ${data.employees.length > 0 ? data.employees.map(emp => `<div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg"><span class="font-medium text-gray-800">${emp}</span><button onclick="removeEmployee('${emp}');" class="text-red-500 hover:text-red-700 font-bold"></button></div>`).join('') : '<p class="text-gray-500 text-sm">No employees yet</p>'}
                    </div>
                  </div>
                  <div class="border-t pt-6">
                    <label class="block text-sm font-semibold text-gray-700 mb-3">Add Employees</label>
                    <textarea id="bulk-input" class="w-full px-4 py-2 bg-gray-50 h-32 text-sm" placeholder="John Smith&#10;Jane Doe&#10;Mike Johnson"></textarea>
                    <button onclick="const text = document.getElementById('bulk-input').value; bulkAddEmployees(text); document.getElementById('bulk-input').value = '';" class="btn-primary w-full text-white font-semibold py-2 rounded-lg mt-3">Add Team Members</button>
                  </div>
                </div>
              ` : state.managerTab === 'tasks' ? `
                <div class="card p-6">
                  <h2 class="text-xl font-bold text-gray-900 mb-6">Daily Task Configuration</h2>
                  <div class="flex gap-2 mb-6 overflow-x-auto pb-2">
                    ${DAYS.map(day => `<button onclick="editDay('${day}');" class="dashboard-tab ${state.editingDay === day ? 'active' : 'inactive'}">${day}</button>`).join('')}
                  </div>
                  ${state.editingDay ? `
                    <div class="space-y-4 max-h-96 overflow-y-auto">
                      <div class="flex items-center justify-between mb-4">
                        <h3 class="font-bold text-gray-900">${state.editingDay} Tasks</h3>
                        <button onclick="addSection();" class="btn-primary text-white px-4 py-2 rounded-lg text-sm">+ Add Section</button>
                      </div>
                      ${Object.entries(state.tempTasks).map(([section, tasks]) => `
                        <div class="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                          <h4 class="font-semibold text-gray-900 mb-3">${section}</h4>
                          <div class="space-y-2 mb-3">
                            ${tasks.map((task, idx) => `<div class="flex items-start gap-2"><input type="text" value="${task}" onchange="updateTask('${section}', ${idx}, this.value);" class="flex-1 px-3 py-2 bg-white text-sm" /><button onclick="deleteTask('${section}', ${idx});" class="text-red-500 hover:text-red-700 font-bold px-2">×</button></div>`).join('')}
                          </div>
                          <button onclick="addTaskToSection('${section}');" class="text-purple-600 hover:text-purple-700 text-sm font-semibold">+ Add Task</button>
                        </div>
                      `).join('')}
                      <button onclick="saveDayTasks();" class="btn-primary w-full text-white font-semibold py-2 rounded-lg mt-4"> Save Changes</button>
                    </div>
                  ` : '<p class="text-gray-500 text-center py-8">Select a day to edit tasks</p>'}
                </div>
              ` : `
                <div class="space-y-6">
                  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div class="stat-card"><div class="stat-value">${data.employees.length}</div><div class="stat-label">Team Members</div></div>
                    <div class="stat-card"><div class="stat-value">${dashStats.totalSelected}</div><div class="stat-label">Tasks Selected Today</div></div>
                    <div class="stat-card"><div class="stat-value">${dashStats.totalCompleted}</div><div class="stat-label">Tasks Completed Today</div></div>
                  </div>
                  <div class="card p-6">
                    <div class="flex items-center justify-between mb-4">
                      <h3 class="text-xl font-bold text-gray-900">This Week's Progress</h3>
                      <button onclick="exportWeekToCSV();" class="export-button"> Export This Week</button>
                    </div>
                    <div class="space-y-3">
                      ${DAYS.map(day => { const dayStats = weeklyStats[day]; const percent = dayStats.selected > 0 ? Math.round((dayStats.completed / dayStats.selected) * 100) : 0; return `<div><div class="flex justify-between mb-1"><span class="text-sm font-semibold text-gray-700">${day}</span><span class="text-sm font-bold text-gray-700">${dayStats.completed}/${dayStats.selected} (${percent}%)</span></div><div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-green-500 h-2 rounded-full transition-all" style="width: ${percent}%"></div></div></div>`; }).join('')}
                    </div>
                  </div>
                  <div class="card p-6">
                    <h3 class="text-xl font-bold text-gray-900 mb-4">Employee Performance Today</h3>
                    <div class="space-y-3">
                      ${data.employees.length > 0 ? data.employees.map(emp => { const stats = getEmployeeStats(emp); const percent = stats.selected > 0 ? Math.round((stats.completed / stats.selected) * 100) : 0; return `<div class="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500"><div class="flex justify-between mb-2"><span class="font-semibold text-gray-900">${emp}</span><span class="text-sm font-bold text-purple-600">${stats.completed}/${stats.selected} completed</span></div><div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-blue-500 h-2 rounded-full transition-all" style="width: ${percent}%"></div></div></div>`; }).join('') : '<p class="text-gray-500 text-center">No employees added yet</p>'}
                    </div>
                  </div>
                  ${Object.keys(data.weeklyArchive).length > 0 ? `
                    <div class="card p-6">
                      <h3 class="text-xl font-bold text-gray-900 mb-4">Archived Weeks</h3>
                      <div class="space-y-3">
                        ${Object.entries(data.weeklyArchive).sort((a, b) => b[0].localeCompare(a[0])).map(([weekKey, archiveData]) => { let totalSelected = 0, totalCompleted = 0; Object.keys(archiveData.selected).forEach(key => { if (archiveData.selected[key]) totalSelected++; if (archiveData.completed[key]) totalCompleted++; }); const percent = totalSelected > 0 ? Math.round((totalCompleted / totalSelected) * 100) : 0; return `<div class="archive-week-card" onclick="state.view = 'archive-detail'; state.archiveWeek = '${weekKey}'; render();"><div class="archive-week-date">${weekKey}</div><div class="archive-week-stats"><div class="archive-stat"><div class="archive-stat-value">${data.employees.length}</div><div class="archive-stat-label">Employees</div></div><div class="archive-stat"><div class="archive-stat-value">${totalSelected}</div><div class="archive-stat-label">Tasks</div></div><div class="archive-stat"><div class="archive-stat-value">${percent}%</div><div class="archive-stat-label">Complete</div></div></div></div>`; }).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>
              `}
            </div>
          </div>
        `;
      } else if (state.view === 'archive-detail') {
        const archiveData = data.weeklyArchive[state.archiveWeek];
        if (!archiveData) {
          state.view = 'manager';
          state.managerTab = 'dashboard';
          render();
          return;
        }
        let employeeStats = {};
        data.employees.forEach(emp => {
          let selected = 0, completed = 0;
          Object.keys(archiveData.selected).forEach(key => {
            if (key.startsWith(emp + '-')) {
              if (archiveData.selected[key]) selected++;
              if (archiveData.completed[key]) completed++;
            }
          });
          employeeStats[emp] = { selected, completed };
        });
        app.innerHTML = `
          <div class="min-h-screen bg-gray-50">
            <div class="gradient-primary text-white p-6 shadow-lg">
              <div class="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h1 class="text-3xl font-bold">Archive: Week ${state.archiveWeek}</h1>
                  <p class="text-purple-200 text-sm mt-1">${config.clubName}</p>
                </div>
                <div class="flex gap-3">
                  <button onclick="exportArchivedWeekToCSV('${state.archiveWeek}');" class="export-button"> Export</button>
                  <button onclick="state.view = 'manager'; state.managerTab = 'dashboard'; render();" class="btn-secondary font-semibold px-6 py-2 rounded-lg">Back</button>
                </div>
              </div>
            </div>
            <div class="max-w-7xl mx-auto p-6">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="stat-card"><div class="stat-value">${data.employees.length}</div><div class="stat-label">Team Members</div></div>
                <div class="stat-card"><div class="stat-value">${Object.values(employeeStats).reduce((sum, s) => sum + s.selected, 0)}</div><div class="stat-label">Total Tasks Selected</div></div>
                <div class="stat-card"><div class="stat-value">${Object.values(employeeStats).reduce((sum, s) => sum + s.completed, 0)}</div><div class="stat-label">Total Tasks Completed</div></div>
              </div>
              <div class="card p-6">
                <h3 class="text-xl font-bold text-gray-900 mb-6">Employee Summary</h3>
                <div class="space-y-3">
                  ${data.employees.map(emp => { const stats = employeeStats[emp] || { selected: 0, completed: 0 }; const percent = stats.selected > 0 ? Math.round((stats.completed / stats.selected) * 100) : 0; return `<div class="bg-gray-50 p-4 rounded-lg border-l-4 border-gray-300"><div class="flex justify-between mb-2"><span class="font-semibold text-gray-900">${emp}</span><span class="text-sm font-bold text-gray-600">${stats.completed}/${stats.selected} completed (${percent}%)</span></div><div class="w-full bg-gray-200 rounded-full h-2"><div class="bg-gray-500 h-2 rounded-full transition-all" style="width: ${percent}%"></div></div></div>`; }).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      } else if (state.view === 'dashboard') {
        const currentDayTasks = data.tasks[todayDay] || {};
        const taskSections = Object.keys(currentDayTasks);
        
        // Calculate overall progress
        let totalTasks = 0;
        let completedTasks = 0;
        Object.entries(currentDayTasks).forEach(([section, tasks]) => {
          tasks.forEach(task => {
            totalTasks++;
            let taskDone = false;
            data.employees.forEach(emp => {
              if (isTaskCompleted(emp, section, task)) {
                taskDone = true;
              }
            });
            if (taskDone) completedTasks++;
          });
        });
        
        // Set default active section
        if (!state.dashboardActiveSection && taskSections.length > 0) {
          state.dashboardActiveSection = taskSections[0];
        }
        
        const activeSection = state.dashboardActiveSection || taskSections[0] || null;
        const activeSectionTasks = activeSection ? (currentDayTasks[activeSection] || []) : [];
        
        // Get all tasks in active section
        let allTasks = activeSectionTasks.map(task => ({
          name: task,
          section: activeSection
        }));
        
        // Set default selected task
        if (!state.selectedTask && allTasks.length > 0) {
          state.selectedTask = JSON.stringify(allTasks[0]);
        }
        
        let selectedTaskObj = null;
        if (state.selectedTask) {
          try {
            selectedTaskObj = JSON.parse(state.selectedTask);
          } catch (e) {
            selectedTaskObj = allTasks[0] || null;
          }
        }
        
        // Check which sections are fully completed
        const sectionCompletionStatus = {};
        taskSections.forEach(section => {
          const tasks = currentDayTasks[section] || [];
          let allCompleted = tasks.length > 0;
          tasks.forEach(task => {
            let taskComplete = false;
            for (let emp of data.employees) {
              if (isTaskCompleted(emp, section, task)) {
                taskComplete = true;
                break;
              }
            }
            if (!taskComplete) allCompleted = false;
          });
          sectionCompletionStatus[section] = allCompleted;
        });
        
        let currentEmployee = state.currentEmployee || data.lastDashboardEmployee || (data.employees[0] || null);
        state.currentEmployee = currentEmployee;

        let employeeDetailsHtml = '';
        if (selectedTaskObj) {
          if (data.employees.length > 0) {
            let dropdownOptions = data.employees.map(emp => {
              const sel = (emp === currentEmployee) ? ' selected' : '';
              return `<option value="${emp}"${sel}>${emp}</option>`;
            }).join('');
            if (!currentEmployee && data.employees.length > 0) {
              currentEmployee = data.employees[0];
              state.currentEmployee = currentEmployee;
              data.lastDashboardEmployee = currentEmployee;
            }
            let rowHtml = '';
            if (currentEmployee) {
              const emp = currentEmployee;
              const isSelected = isTaskSelected(emp, selectedTaskObj.section, selectedTaskObj.name);
              const isCompleted = isTaskCompleted(emp, selectedTaskObj.section, selectedTaskObj.name);
              const timestamp = getTaskTimestamp(emp, selectedTaskObj.section, selectedTaskObj.name);
              let rowClass = '';
              if (isCompleted) rowClass = 'completed';
              else if (isSelected) rowClass = 'claimed';
              rowHtml = `
                <div class="dashboard-employee-row ${rowClass}">
                  <div style="flex: 1;">
                    <div class="dashboard-employee-name">${emp}</div>
                    ${isCompleted && timestamp ? `
                      <div class="dashboard-employee-time">Done at ${formatTime(timestamp)}</div>
                    ` : ''}
                  </div>
                  <div class="dashboard-button-group">
                    <button
                      onclick="claimCurrentTask();"
                      class="dashboard-btn ${isSelected || isCompleted ? 'active' : ''}"
                    >
                      ${isSelected || isCompleted ? 'Claimed' : 'Claim'}
                    </button>
                    <button
                      onclick="completeCurrentTask();"
                      class="dashboard-btn complete"
                      ${!isSelected || isCompleted ? 'disabled' : ''}
                    >
                      ${isCompleted ? 'Done' : 'Complete'}
                    </button>
                  </div>
                </div>
              `;
            }
            employeeDetailsHtml = `
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="margin-bottom: 4px;">
                  <label style="display:block; font-size:11px; font-weight:600; color: var(--gray-600); margin-bottom:4px;">
                    Employee
                  </label>
                  <select 
                    onchange="handleDashboardEmployeeChange(this.value)" 
                    style="
                      width: 100%;
                      padding: 8px 10px;
                      border-radius: 6px;
                      border: 1px solid var(--gray-300);
                      font-size: 13px;
                      background: white;
                    "
                  >
                    ${dropdownOptions}
                  </select>
                </div>
                ${rowHtml || '<p style="text-align: center; color: #a3a3a3;">Select an employee to start</p>'}
              </div>
            `;
          } else {
            employeeDetailsHtml = '<p style="text-align: center; color: #a3a3a3;">No employees added yet</p>';
          }
        }

        app.innerHTML = `
          <div class="min-h-screen bg-gray-50">
            <div class="gradient-primary text-white p-6 shadow-lg">
              <div class="max-w-7xl mx-auto flex items-center justify-between">
                <div>
                  <h1 class="text-3xl font-bold">Cleaning Dashboard</h1>
                  <p class="text-purple-200 text-sm mt-1"><span class="font-semibold">${sanitizeInput(config.clubName)}</span> <span class="opacity-75">|</span> <span>${todayDay}'s Daily Tasks</span></p>
                </div>
                <button onclick="state.view = 'start'; state.selectedTask = null; state.dashboardActiveSection = null; render();" class="btn-secondary font-semibold px-6 py-2 rounded-lg" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3);">
                  Back to Menu
                </button>
              </div>
            </div>

            <!-- Professional Stats Banner -->
            <div style="background: white; border-bottom: 2px solid var(--gray-200); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
              <div style="max-width: 1400px; margin: 0 auto; padding: 24px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 20px;">
                  
                  <!-- Tasks Progress Card -->
                  <div style="background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%); padding: 20px; border-radius: 8px; border-left: 4px solid var(--primary);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
                      <div>
                        <div style="font-size: 12px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px;">Tasks Completed</div>
                        <div style="font-size: 32px; font-weight: 700; color: var(--primary); line-height: 1; margin-top: 8px;">${completedTasks}<span style="font-size: 20px; color: var(--gray-500);">/${totalTasks}</span></div>
                      </div>
                    </div>
                    <div style="width: 100%; background: rgba(255,255,255,0.6); height: 8px; border-radius: 4px; overflow: hidden;">
                      <div style="width: ${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%; height: 100%; background: var(--primary); transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);"></div>
                    </div>
                  </div>

                  <!-- Completion Rate Card -->
                  <div style="background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); padding: 20px; border-radius: 8px; border-left: 4px solid var(--success);">
                    <div style="font-size: 12px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Completion Rate</div>
                    <div style="font-size: 32px; font-weight: 700; color: var(--success); line-height: 1;">${totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0}%</div>
                    <div style="font-size: 13px; color: var(--gray-600); margin-top: 8px; font-weight: 500;">${totalTasks - completedTasks} tasks remaining</div>
                  </div>

                  <!-- Reset Timer Card -->
                  <div style="background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%); padding: 20px; border-radius: 8px; border-left: 4px solid #0284c7;">
                    <div style="font-size: 12px; font-weight: 600; color: var(--gray-600); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Daily Reset</div>
                    <div style="font-size: 28px; font-weight: 700; color: #0284c7; line-height: 1; font-variant-numeric: tabular-nums;">${timeUntilReset}</div>
                    <div style="font-size: 13px; color: var(--gray-600); margin-top: 8px; font-weight: 500;">Time remaining</div>
                  </div>

                </div>
                ${completedTasks === totalTasks && totalTasks > 0 ? `
                  <div style="margin-top: 20px; padding: 16px 24px; background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%); border-radius: 8px; border: 2px solid var(--success); display: flex; align-items: center; justify-content: space-between; animation: slideDown 0.4s ease;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                      <div style="width: 40px; height: 40px; background: var(--success); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px; font-weight: 700; font-family: Arial, sans-serif;">✓</div>
                      <div>
                        <div style="font-size: 16px; font-weight: 700; color: var(--success);">All Tasks Complete</div>
                        <div style="font-size: 13px; color: var(--gray-600); margin-top: 2px;">Excellent work from the team today</div>
                      </div>
                    </div>
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Section Tabs -->
            <div class="sticky top-0 bg-white border-b border-gray-200 shadow-sm" style="z-index: 20;">
              <div style="max-width: 1400px; margin: 0 auto; padding: 0 24px;">
                <div class="task-tabs">
                  ${taskSections.map(section => {
                    const isActive = section === activeSection;
                    const isComplete = sectionCompletionStatus[section];
                    return `
                      <button
                        onclick="state.dashboardActiveSection = '${section}'; state.selectedTask = null; render();"
                        class="task-tab-button ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}"
                        style="${isComplete ? 'background: #ecfdf5; color: #047857; border-bottom-color: #047857;' : ''}"
                      >
                        ${section}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>

            <div style="max-width: 1400px; margin: 0 auto; padding: 24px;">
              <div class="dashboard-split-container">
                
                <!-- LEFT: Task List -->
                <div class="dashboard-task-list">
                  <h2>${activeSection}</h2>
                  ${allTasks.length > 0 ? allTasks.map(task => {
                    const isSelected = JSON.stringify(task) === state.selectedTask;
                    let completedCount = 0;
                    data.employees.forEach(emp => {
                      if (isTaskCompleted(emp, task.section, task.name)) {
                        completedCount++;
                      }
                    });
                    const taskComplete = completedCount === data.employees.length;
                    return `
                      <button
                        onclick="state.selectedTask = '${JSON.stringify(task).replace(/"/g, '&quot;')}'; render();"
                        class="dashboard-task-item ${isSelected ? 'active' : ''} ${taskComplete ? 'complete' : ''}"
                        style="${taskComplete ? 'background: #ecfdf5; border-left-color: #047857; color: #047857;' : ''}"
                      >
                        <span class="dashboard-task-item-name">${task.name}</span>
                      </button>
                    `;
                  }).join('') : '<p style="text-align: center; color: #a3a3a3; margin-top: 20px;">No tasks</p>'}
                </div>

                <!-- RIGHT: Employee Details -->
                <div class="dashboard-employee-details">
                  ${selectedTaskObj ? `
                    <h3>${selectedTaskObj.section}</h3>
                    <h2>${selectedTaskObj.name}</h2>

                                        ${employeeDetailsHtml}

                  ` : '<div style="text-align: center; color: #a3a3a3; padding: 40px;">Select a task from the left</div>'}
                </div>

              </div>
            </div>
          </div>
        `;
      }
    }

// Wait for DOM to be ready before running
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
    loadData();
    if (data.weeklyReportPendingWeekKey) {
      setTimeout(showWeeklyReportToast, 0);
    }
    render();
    
    setInterval(() => {
      if (state.view === 'dashboard') render();
    }, 60000);
});
  
