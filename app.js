/**
 * ==========================================================================
 * 📁 PXMPT FOREST — LIFELIKE MASTER JAVASCRIPT ENGINE (CLOUD SYNCED)
 * ==========================================================================
 */

const FirebaseEnvironment = {
    apiKey: "AIzaSyCDnJh7GpOQnwccFWGEcwoQ71l8pVIZBQI",
    authDomain: "prompt-7914d.firebaseapp.com",
    projectId: "prompt-7914d",
    storageBucket: "prompt-7914d.firebasestorage.app",
    messagingSenderId: "848428533255",
    appId: "1:848428533255:web:b42f1a0c0e1278c1ae8ca2"

};

firebase.initializeApp(FirebaseEnvironment);
const db = firebase.firestore();
const auth = firebase.auth();

const AppEngine = {
    prompts: [],
    categories: [],
    authenticatedUser: null,
    authMode: 'login', 
    currentCategoryColorMode: 'solid', 
    
    filterState: {
        activeCategory: 'all',
        searchQuery: '',
        favoritesOnly: false
    },

    isRunningOnFileProtocol() {
        return window.location.protocol === 'file:';
    },

    hasValidFirebaseConfig() {
        return !!(FirebaseEnvironment.apiKey && !FirebaseEnvironment.apiKey.includes('YOUR_') && FirebaseEnvironment.authDomain && FirebaseEnvironment.projectId);
    },

    translateAuthError(error) {
        if (!error || typeof error !== 'object') return 'Authentication failed.';
        const code = error.code || '';
        const message = (error.message || '').toString();
        if (code === 'auth/email-already-in-use') return 'Account already exists. Please log in.';
        if (code === 'auth/wrong-password') return 'Incorrect password. Please try again.';
        if (code === 'auth/invalid-credential') return 'Sign-in credential is invalid or expired. Please re-enter your email/password or try again.';
        if (code === 'auth/user-not-found') return 'No account found for this email.';
        if (code === 'auth/invalid-email') return 'Enter a valid email address.';
        if (code === 'auth/weak-password') return 'Password should be at least 6 characters.';
        if (code === 'auth/operation-not-allowed') return 'Sign-in method is disabled in Firebase.';
        if (code === 'auth/unauthorized-domain') return 'This origin is not authorized in Firebase. Add localhost or 127.0.0.1 to Authorized Domains.';
        if (code === 'auth/network-request-failed') return 'Network issue. Check your internet connection and retry.';
        if (code === 'auth/too-many-requests') return 'Too many attempts. Please wait a moment and try again.';
        if (code === 'auth/popup-blocked') return 'Popup blocked. Allow popups and retry Google sign-in.';
        if (code === 'auth/popup-closed-by-user') return 'Google sign-in was closed before completing.';
        if (code === 'auth/cancelled-popup-request') return 'Google sign-in was cancelled.';
        if (message.toLowerCase().includes('auth/unauthorized-domain') || message.toLowerCase().includes('unauthorized domain')) return 'This origin is not authorized in Firebase. Add localhost or 127.0.0.1 to Authorized Domains.';
        if (message.toLowerCase().includes('api key') || message.toLowerCase().includes('api-key-not-valid')) return 'Firebase API key is invalid. Update app.js with your Firebase config.';
        if (message.toLowerCase().includes('invalid_login_credentials')) return 'Invalid login credentials. Check email and password.';
        return message || 'Authentication failed.';
    },

    fallbackPresets: {
        prompts: [
            { id: 1001, title: "Blog Post Generator", icon: "📝", text: "Create engaging blog posts with ease using this simple framework.", category: "Writing", subCategory: "SEO Content", liked: false },
            { id: 1002, title: "Social Media Caption", icon: "🎯", text: "Generate scroll-stopping captions for any platform.", category: "Marketing", subCategory: "Social Strategy", liked: false },
            { id: 1003, title: "Code Explainer", icon: "💻", text: "Explain any code snippet in simple terms.", category: "Development", subCategory: "Debugging", liked: false },
            { id: 1004, title: "Product Idea Validator", icon: "💡", text: "Validate your product idea instantly with key insights.", category: "Business", subCategory: "Startups", liked: false }
        ],
        categories: [
            { name: "all", colorMode: "solid", colorValue: "#ffffff" },
            { name: "Writing", colorMode: "solid", colorValue: "#dfff4f" },      
            { name: "Marketing", colorMode: "solid", colorValue: "#32e27b" },    
            { name: "Development", colorMode: "gradient", colorValue: "linear-gradient(135deg, #3ebdff, #7c4dff)" },  
            { name: "Business", colorMode: "solid", colorValue: "#ff6b6b" }      
        ]
    },

    init() {
        this.bindEvents(); 
        this.bindLivePreviewEvents();

        if (this.isRunningOnFileProtocol()) {
            this.dispatchToastAlert('Firebase auth is not supported over file://. Run the app through a local server or host it with http://localhost.', 'warning');
        }

        if (!this.hasValidFirebaseConfig()) {
            this.dispatchToastAlert('Firebase config is missing or invalid. Set your real Firebase keys in app.js.', 'warning');
        }

        auth.useDeviceLanguage();
        auth.onAuthStateChanged(async (user) => {
            if (user) {
                this.authenticatedUser = {
                    uid: user.uid,
                    name: user.displayName || 'Vault User',
                    email: user.email,
                    photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=7c4dff&color=fff`
                };
                await this.fetchCloudData();
            } else {
                this.authenticatedUser = null;
                const localPrompts = localStorage.getItem('forest_prompts_v5');
                const localCategories = localStorage.getItem('forest_categories_v5');
                this.prompts = localPrompts ? JSON.parse(localPrompts) : [...this.fallbackPresets.prompts];
                this.categories = localCategories ? JSON.parse(localCategories) : [...this.fallbackPresets.categories];
                this.syncUI();
            }
            this.evaluateAuthState();
            this.switchViewport('home'); 
        });
    },

    async fetchCloudData() {
        if (!this.authenticatedUser) return;
        try {
            this.dispatchToastAlert("Syncing Vault with Cloud...", "info");
            const docRef = db.collection("users").doc(this.authenticatedUser.uid);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                const data = docSnap.data() || {};
                this.prompts = Array.isArray(data.prompts) && data.prompts.length ? data.prompts : [...this.fallbackPresets.prompts];
                this.categories = Array.isArray(data.categories) && data.categories.length ? data.categories : [...this.fallbackPresets.categories];
                localStorage.setItem("forest_prompts_v5", JSON.stringify(this.prompts));
                localStorage.setItem("forest_categories_v5", JSON.stringify(this.categories));
                this.dispatchToastAlert("Cloud Sync Complete.", "success");
            } else {
                this.prompts = [...this.fallbackPresets.prompts];
                this.categories = [...this.fallbackPresets.categories];
                await this.saveData(); 
            }
            this.syncUI();
        } catch (error) {
            console.error("Cloud Sync Error:", error);
            this.dispatchToastAlert("Could not sync cloud data.", "warning");
        }
    },

    async saveData() {
        localStorage.setItem("forest_prompts_v5", JSON.stringify(this.prompts));
        localStorage.setItem("forest_categories_v5", JSON.stringify(this.categories));

        if (this.authenticatedUser && this.authenticatedUser.uid) {
            try {
                await db.collection("users").doc(this.authenticatedUser.uid).set({
                    prompts: this.prompts,
                    categories: this.categories
                }, { merge: true }); 
            } catch (error) {
                console.error("Cloud Save Error:", error);
            }
        }
    },

    switchAuthTab(mode) {
        this.authMode = mode;
        const nameGroup = document.getElementById("nameInputGroup");
        const submitBtn = document.getElementById("authSubmitBtn");
        
        document.getElementById("tabLogin").classList.remove("active");
        document.getElementById("tabSignup").classList.remove("active");

        if (mode === 'signup') {
            document.getElementById("tabSignup").classList.add("active");
            nameGroup.style.display = "flex";
            document.getElementById("authName").required = true;
            submitBtn.innerText = "Create Vault Account";
            submitBtn.style.background = "var(--mint-green-accent)";
        } else {
            document.getElementById("tabLogin").classList.add("active");
            nameGroup.style.display = "none";
            document.getElementById("authName").required = false;
            submitBtn.innerText = "Access Vault";
            submitBtn.style.background = "var(--neon-yellow-shadow)";
        }
    },

    async executeStandardAuth(e) {
        e.preventDefault();
        const nameInput = document.getElementById('authName').value.trim();
        const emailInput = document.getElementById('authEmail').value.trim();
        const passInput = document.getElementById('authPassword').value.trim();

        if (this.isRunningOnFileProtocol()) {
            this.dispatchToastAlert('Email sign-in requires a web origin. Use a local server or deploy the app with http://localhost.', 'warning');
            return;
        }

        if (!this.hasValidFirebaseConfig()) {
            this.dispatchToastAlert('Firebase configuration is invalid. Set your real Firebase keys in app.js.', 'warning');
            return;
        }

        if (this.authMode === 'signup' && !nameInput) {
            this.dispatchToastAlert('Please provide your full name.', 'warning');
            return;
        }
        if (!emailInput || !passInput) {
            this.dispatchToastAlert('Please enter both email and password.', 'warning');
            return;
        }

        const submitBtn = document.getElementById('authSubmitBtn');
        submitBtn.disabled = true;
        this.dispatchToastAlert('Authenticating...', 'info');

        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            if (this.authMode === 'signup') {
                const userCredential = await auth.createUserWithEmailAndPassword(emailInput, passInput);
                await userCredential.user.updateProfile({ displayName: nameInput });
            } else {
                await auth.signInWithEmailAndPassword(emailInput, passInput);
            }
            this.closeOpenModals();
        } catch (error) {
            const msg = this.translateAuthError(error);
            this.dispatchToastAlert(msg, 'warning');
        } finally {
            submitBtn.disabled = false;
        }
    },

    async executeGoogleSignIn() {
        if (this.isRunningOnFileProtocol()) {
            this.dispatchToastAlert('Google sign-in requires http://localhost or https. File:// will not work.', 'warning');
            return;
        }

        if (!this.hasValidFirebaseConfig()) {
            this.dispatchToastAlert('Firebase configuration is invalid. Set your real Firebase keys in app.js.', 'warning');
            return;
        }

        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
            const provider = new firebase.auth.GoogleAuthProvider();
            await auth.signInWithPopup(provider);
            this.closeOpenModals();
        } catch (error) {
            const msg = this.translateAuthError(error);
            this.dispatchToastAlert(msg, 'warning');
        }
    },

    async executeSignOut() {
        try {
            if (this.authenticatedUser) {
                await this.saveData();
            }
            await auth.signOut();
            this.closeOpenModals();
        } catch (error) {
            console.error("Sign Out Error:", error);
            this.dispatchToastAlert("Error signing out. Please try again.", "warning");
        }
    },

    evaluateAuthState() {
        const headerHook = document.getElementById("headerAuthSlot");
        const settingsHook = document.getElementById("settingsAuthBtnSlot");

        if (this.authenticatedUser) {
            if (headerHook) {
                headerHook.innerHTML = `
                    <div class="user-profile-identity-capsule haptic-target" onclick="AppEngine.launchTargetModalOverlay('settingsPanelModal')" title="View Account">
                        <img src="${this.authenticatedUser.photoURL}" class="user-avatar-image-node" alt="Avatar">
                        <div class="user-label-strings">
                            <h5>${this.authenticatedUser.name}</h5>
                            <p style="color: var(--premium-purple-accent);">Cloud Synced</p>
                        </div>
                    </div>
                `;
            }
            if (settingsHook) {
                settingsHook.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                        <img src="${this.authenticatedUser.photoURL}" style="width: 58px; height: 58px; border-radius: 50%; border: 3px solid var(--brutal-black-line); box-shadow: 2px 2px 0px var(--brutal-black-line);">
                        <div>
                            <h5 style="font-family: var(--font-heading); font-size: 20px; font-weight: 900; color: var(--text-charcoal-primary);">${this.authenticatedUser.name}</h5>
                            <p style="font-size: 14px; opacity: 0.8; font-weight: 600;">${this.authenticatedUser.email}</p>
                        </div>
                    </div>
                    <button class="liquid-brutal-master-btn haptic-target" style="background: var(--soft-coral-accent); color:#fff; width: 100%; justify-content: center;" onclick="AppEngine.executeSignOut()">
                        <i data-lucide="log-out" style="width: 18px; height: 18px;"></i> Sign Out
                    </button>
                `;
            }
        } else {
            if (headerHook) {
                headerHook.innerHTML = `
                    <button class="liquid-brutal-master-btn haptic-target" style="background: var(--neon-yellow-shadow); padding: 10px 18px; font-size:14px;" onclick="AppEngine.launchTargetModalOverlay('authModal')">
                        <i data-lucide="user" style="width: 16px; height: 16px;"></i> Sign In
                    </button>
                `;
            }
            if (settingsHook) {
                settingsHook.innerHTML = `
                    <p style="font-size: 14px; font-weight: 600; margin-bottom: 16px;">You are currently browsing the local vault as a guest.</p>
                    <button class="liquid-brutal-master-btn haptic-target" style="background: var(--neon-yellow-shadow); width: 100%; justify-content: center;" onclick="AppEngine.closeOpenModals(); AppEngine.launchTargetModalOverlay('authModal')">
                        Log In or Sign Up
                    </button>
                `;
            }
        }
        if (window.lucide) lucide.createIcons();
    },

    handlePromptSubmit(e) {
        e.preventDefault();
        const id = document.getElementById("formPromptId").value;
        const title = document.getElementById("formPromptTitle").value;
        const icon = document.getElementById("formPromptIcon").value;
        const text = document.getElementById("formPromptText").value;
        const category = document.getElementById("formPromptCategorySelect").value;
        const subCategory = document.getElementById("formPromptSubCategory").value;

        const payload = {
            id: id ? parseInt(id) : Date.now(),
            title: title.trim(),
            icon: icon.trim() || "📝",
            text: text.trim(),
            category,
            subCategory: subCategory.trim() || category,
            liked: false
        };

        if (id) {
            const index = this.prompts.findIndex(p => p.id === payload.id);
            if (index !== -1) {
                payload.liked = this.prompts[index].liked;
                this.prompts[index] = payload;
            }
            this.dispatchToastAlert("Blueprint Updated.", "success");
        } else {
            this.prompts.unshift(payload);
            this.dispatchToastAlert("Blueprint Saved.", "success");
        }

        this.saveData();
        this.closeOpenModals();
        this.syncUI();
    },

    executeCardPurge(id) {
        this.prompts = this.prompts.filter(p => p.id !== parseInt(id));
        this.saveData();
        this.syncUI();
        this.dispatchToastAlert("Record purged.", "info");
    },

    toggleCardFavoritedState(id) {
        const index = this.prompts.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            this.prompts[index].liked = !this.prompts[index].liked;
            this.saveData();
            this.syncUI();
        }
    },

    // --- FIX: LIVE PREVIEW UPDATER ---
    updateCategoryPreview() {
        const previewBox = document.getElementById("categoryLivePreview");
        const nameInput = document.getElementById("formNewCatName").value || "Preview Style";
        previewBox.innerText = nameInput;

        if (this.currentCategoryColorMode === 'solid') {
            previewBox.style.background = document.getElementById("formNewCatColorSolid").value;
        } else {
            const c1 = document.getElementById("formNewCatColorGrad1").value;
            const c2 = document.getElementById("formNewCatColorGrad2").value;
            previewBox.style.background = `linear-gradient(135deg, ${c1}, ${c2})`;
        }
    },

    bindLivePreviewEvents() {
        document.getElementById("formNewCatName").addEventListener("input", () => this.updateCategoryPreview());
        document.getElementById("formNewCatColorSolid").addEventListener("input", () => this.updateCategoryPreview());
        document.getElementById("formNewCatColorGrad1").addEventListener("input", () => this.updateCategoryPreview());
        document.getElementById("formNewCatColorGrad2").addEventListener("input", () => this.updateCategoryPreview());
    },

    toggleColorMode(mode) {
        this.currentCategoryColorMode = mode;
        document.getElementById("tabSolidColor").classList.toggle("active", mode === "solid");
        document.getElementById("tabGradientColor").classList.toggle("active", mode === "gradient");
        
        document.getElementById("solidColorSelector").style.display = mode === "solid" ? "flex" : "none";
        document.getElementById("gradientColorSelector").style.display = mode === "gradient" ? "flex" : "none";
        
        this.updateCategoryPreview();
    },

    handleCategorySubmit(e) {
        e.preventDefault();
        const oldName = document.getElementById("formOldCatName").value;
        const newName = document.getElementById("formNewCatName").value.trim();
        
        let newColorValue = "";
        if (this.currentCategoryColorMode === 'solid') {
            newColorValue = document.getElementById("formNewCatColorSolid").value;
        } else {
            const c1 = document.getElementById("formNewCatColorGrad1").value;
            const c2 = document.getElementById("formNewCatColorGrad2").value;
            newColorValue = `linear-gradient(135deg, ${c1}, ${c2})`;
        }

        if (oldName.toLowerCase() !== newName.toLowerCase() && this.categories.some(c => c.name.toLowerCase() === newName.toLowerCase())) {
            this.dispatchToastAlert("Category name already exists.", "warning");
            return;
        }

        if (oldName) {
            const index = this.categories.findIndex(c => c.name === oldName);
            if (index !== -1) {
                this.categories[index].name = newName;
                this.categories[index].colorMode = this.currentCategoryColorMode;
                this.categories[index].colorValue = newColorValue;
            }
            this.prompts.forEach(p => { if (p.category === oldName) p.category = newName; });
            this.dispatchToastAlert(`Branch '${newName}' updated.`, "success");
        } else {
            this.categories.push({ name: newName, colorMode: this.currentCategoryColorMode, colorValue: newColorValue });
            this.dispatchToastAlert(`Branch '${newName}' built.`, "success");
        }

        this.saveData(); 
        document.getElementById("categoryFormModal").classList.remove("open");
        this.launchTargetModalOverlay("categoryManagerModal");
        this.renderCategoryManager();
        this.syncUI();
    },

    deleteCategory(catName) {
        if (!confirm(`Are you sure you want to delete the '${catName}' branch? Prompts inside will be moved to a general category.`)) return;

        let fallback = this.categories.find(c => c.name !== 'all' && c.name !== catName);
        if (!fallback) {
            fallback = { name: "General", colorMode: "solid", colorValue: "#e0e0e0" };
            this.categories.push(fallback);
        }

        this.categories = this.categories.filter(c => c.name !== catName);
        this.prompts.forEach(p => { if (p.category === catName) p.category = fallback.name; });

        if (this.filterState.activeCategory === catName) {
            this.filterState.activeCategory = 'all';
        }

        this.saveData(); 
        this.renderCategoryManager();
        this.syncUI();
        this.dispatchToastAlert(`Branch '${catName}' deleted.`, "info");
    },

    purgeSystemDatabaseCache() {
        localStorage.clear();
        this.dispatchToastAlert("Wiping System Memory...", "info");
        setTimeout(() => location.reload(), 750);
    },

    bindEvents() {
        const searchInput = document.getElementById("promptSearchField");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                this.filterState.searchQuery = e.target.value;
                this.renderPrompts();
            });
        }

        document.getElementById("authGatewayForm").addEventListener("submit", (e) => this.executeStandardAuth(e));
        document.getElementById("promptDataAssetForm").addEventListener("submit", (e) => this.handlePromptSubmit(e));
        document.getElementById("categoryDataAssetForm").addEventListener("submit", (e) => this.handleCategorySubmit(e));

        document.getElementById("openCategoryManagerBtn").addEventListener("click", () => {
            this.launchTargetModalOverlay("categoryManagerModal");
            this.renderCategoryManager();
        });

        const routes = [
            { id: "dockHome", action: () => { this.filterState.favoritesOnly = false; this.switchViewport('home'); } },
            { id: "dockFavs", action: () => { this.filterState.favoritesOnly = true; this.switchViewport('home'); } },
            { id: "dockFolders", action: () => { this.switchViewport('folders'); } },
            { id: "dockSettings", action: () => { this.launchTargetModalOverlay("settingsPanelModal"); } }
        ];

        routes.forEach(route => {
            const node = document.getElementById(route.id);
            if (node) {
                node.addEventListener("click", () => {
                    document.querySelectorAll('.dock-link-item').forEach(n => n.classList.remove('active'));
                    node.classList.add('active');
                    route.action();
                });
            }
        });

        const addBtn = document.getElementById("dockAddPrompt");
        if (addBtn) addBtn.addEventListener("click", () => this.openPromptWriterModal());
    },

    switchViewport(view) {
        const homeView = document.getElementById("homeViewPort");
        const foldersView = document.getElementById("foldersViewPort");

        [homeView, foldersView].forEach(v => {
            if(v) {
                v.classList.remove("active-viewport");
                v.classList.add("hidden-viewport");
            }
        });

        const target = document.getElementById(view + "ViewPort");
        if(target) {
            target.classList.remove("hidden-viewport");
            target.classList.add("active-viewport");
        }

        if (view === 'home') this.renderPrompts();
        if (view === 'folders') this.renderForestMap();
    },

    syncUI() {
        this.renderCategories();
        this.renderPrompts();
        this.repopulateCategoryDropdown();
        if (document.getElementById("foldersViewPort").classList.contains("active-viewport")) {
            this.renderForestMap();
        }
    },

    getBackgroundCSS(cat) {
        if (!cat || !cat.colorValue) return "background-color: #ffffff;";
        return cat.colorMode === 'gradient' ? `background-image: ${cat.colorValue};` : `background-color: ${cat.colorValue};`;
    },

    renderCategoryManager() {
        const slot = document.getElementById("categoryManagerListSlot");
        if (!slot) return;
        slot.innerHTML = "";

        this.categories.forEach(cat => {
            if (cat.name === 'all') return;

            const bgCSS = this.getBackgroundCSS(cat);
            const item = document.createElement("div");
            item.className = "category-manager-item haptic-target";
            item.innerHTML = `
                <div class="category-manager-item-left">
                    <div class="category-color-dot" style="${bgCSS}"></div>
                    <span>${cat.name}</span>
                </div>
                <div class="category-manager-actions">
                    <button class="card-micro-action-btn haptic-target" onclick="AppEngine.openCategoryForm('${cat.name}')" title="Edit">
                        <i data-lucide="pencil" style="width: 15px; height: 15px;"></i>
                    </button>
                    <button class="card-micro-action-btn haptic-target" onclick="AppEngine.deleteCategory('${cat.name}')" title="Delete">
                        <i data-lucide="trash-2" style="width: 15px; height: 15px; color: var(--soft-coral-accent);"></i>
                    </button>
                </div>
            `;
            slot.appendChild(item);
        });
        if (window.lucide) lucide.createIcons();
    },

    renderCategories() {
        const track = document.getElementById("categoryPillTrack");
        if (!track) return;
        track.innerHTML = "";

        this.categories.forEach(category => {
            let count = category.name === 'all' 
                ? this.prompts.length 
                : this.prompts.filter(p => p.category === category.name).length;

            const isActive = this.filterState.activeCategory === category.name;
            const bgCSS = category.name === 'all' ? "background-color: #ffffff;" : this.getBackgroundCSS(category);
            
            const pill = document.createElement("div");
            pill.className = `category-selection-gel-pill haptic-target ${isActive ? 'active' : ''}`;
            pill.style.cssText = `${bgCSS} color: var(--text-charcoal-primary);`;
            
            pill.innerHTML = `
                <span>${category.name === 'all' ? 'All' : category.name}</span>
                <span class="pill-quantity-string">${count} Elements</span>
            `;
            
            pill.addEventListener("click", () => {
                document.querySelectorAll(".category-selection-gel-pill").forEach(c => c.classList.remove("active"));
                pill.classList.add("active");
                this.filterState.activeCategory = category.name;
                this.renderPrompts();
            });

            track.appendChild(pill);
        });
    },

    renderPrompts() {
        const grid = document.getElementById("promptsGridContainer");
        if (!grid) return;
        grid.innerHTML = "";

        let activeDataset = this.prompts.filter(item => {
            const queryMatch = item.title.toLowerCase().includes(this.filterState.searchQuery.toLowerCase()) || 
                               item.text.toLowerCase().includes(this.filterState.searchQuery.toLowerCase());
            const categoryMatch = this.filterState.activeCategory === 'all' || item.category === this.filterState.activeCategory;
            const favoriteMatch = !this.filterState.favoritesOnly || item.liked;
            return queryMatch && categoryMatch && favoriteMatch;
        });

        if (activeDataset.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 70px 20px; font-weight: 700; opacity: 0.5;">
                    <i data-lucide="help-circle" style="margin: 0 auto 16px auto; width: 54px; height: 54px; stroke-width: 1.5;"></i>
                    <p style="font-size: 16px;">No operational blueprints match current filters.</p>
                </div>
            `;
            if (window.lucide) lucide.createIcons();
            return;
        }

        activeDataset.forEach(prompt => {
            const categoryData = this.categories.find(c => c.name === prompt.category) || { colorMode: 'solid', colorValue: '#ffffff' };
            const bgCSS = this.getBackgroundCSS(categoryData);
            const safePayload = btoa(unescape(encodeURIComponent(prompt.text)));
            
            const wrapper = document.createElement("div");
            wrapper.className = "gel-molded-prompt-card";
            
            wrapper.innerHTML = `
                <div class="card-header-bar" style="${bgCSS}">
                    <div class="card-header-left-cluster">
                        <div class="card-custom-icon-box">${prompt.icon}</div>
                        <span class="card-header-title">${prompt.title}</span>
                    </div>
                    <div class="card-action-utilities-mesh">
                        <button class="card-micro-action-btn haptic-target" onclick="AppEngine.openPromptWriterModal(${prompt.id})" title="Edit">
                            <i data-lucide="pencil" style="width: 15px; height: 15px;"></i>
                        </button>
                        <button class="card-micro-action-btn haptic-target" style="color: #444;" onclick="AppEngine.executeCardPurge(${prompt.id})" title="Delete">
                            <i data-lucide="trash-2" style="width: 15px; height: 15px;"></i>
                        </button>
                    </div>
                </div>
                <div class="card-textual-body">
                    <p>${prompt.text}</p>
                </div>
                <div class="card-lower-row">
                    <span class="card-category-tag-pill">${prompt.subCategory}</span>
                    <div class="card-footer-tray-actions">
                        <button class="tray-action-btn-node haptic-target" onclick="AppEngine.toggleCardFavoritedState(${prompt.id})" title="Like">
                            <i data-lucide="heart" style="width: 20px; height: 20px; ${prompt.liked ? 'fill: var(--premium-purple-accent); stroke: var(--premium-purple-accent);' : ''}"></i>
                        </button>
                        <button class="tray-action-btn-node haptic-target" onclick="AppEngine.copyTextToBuffer('${safePayload}')" title="Copy">
                            <i data-lucide="copy" style="width: 20px; height: 20px;"></i>
                        </button>
                    </div>
                </div>
            `;
            grid.appendChild(wrapper);
        });

        if (window.lucide) lucide.createIcons();
    },

    renderForestMap() {
        const slot = document.getElementById("forestTreeMapSlot");
        if (!slot) return;
        slot.innerHTML = "";

        const mapData = {};
        this.categories.forEach(cat => {
            if (cat.name === 'all') return;
            mapData[cat.name] = { colorCSS: this.getBackgroundCSS(cat), colorMode: cat.colorMode, colorValue: cat.colorValue, subCategories: {} };
        });

        this.prompts.forEach(prompt => {
            if(!mapData[prompt.category]) return;
            const sub = prompt.subCategory || prompt.category;
            if(!mapData[prompt.category].subCategories[sub]) mapData[prompt.category].subCategories[sub] = [];
            mapData[prompt.category].subCategories[sub].push(prompt);
        });

        const rootUl = document.createElement("ul");
        rootUl.className = "tree-list";

        Object.keys(mapData).forEach(catName => {
            const catNode = mapData[catName];
            if (Object.keys(catNode.subCategories).length === 0) return;

            const liCat = document.createElement("li");
            liCat.className = "tree-node";
            const bgStyle = this.getBackgroundCSS(catNode);
            const borderColor = catNode.colorMode === 'gradient' ? 'rgba(124, 77, 255, 0.4)' : catNode.colorValue;
            liCat.innerHTML = `
                <div class="tree-card-label" style="${bgStyle} border-left: 8px solid ${borderColor};">
                    <i data-lucide="folder" style="width:20px; height:20px;"></i>
                    ${catName} Branch
                </div>
            `;

            const subUl = document.createElement("ul");
            subUl.className = "tree-list";

            Object.keys(catNode.subCategories).forEach(subName => {
                const arr = catNode.subCategories[subName];
                const liSub = document.createElement("li");
                liSub.className = "tree-node";
                liSub.innerHTML = `
                    <div class="tree-card-label" style="font-size: 15px; padding: 12px 18px;">
                        <i data-lucide="corner-down-right" style="width:18px; height:18px;"></i>
                        ${subName} Node
                    </div>
                `;

                const promptUl = document.createElement("ul");
                promptUl.className = "tree-list";

                arr.forEach(p => {
                    const liP = document.createElement("li");
                    liP.className = "tree-node";
                    const payload = btoa(unescape(encodeURIComponent(p.text)));
                    
                    liP.innerHTML = `
                        <div class="tree-prompt-card haptic-target" onclick="AppEngine.copyTextToBuffer('${payload}')">
                            <div class="tree-card-icon">${p.icon}</div>
                            <span>${p.title}</span>
                            <i data-lucide="copy" style="width:15px; height:15px; margin-left:auto; opacity:0.5;"></i>
                        </div>
                    `;
                    promptUl.appendChild(liP);
                });

                liSub.appendChild(promptUl);
                subUl.appendChild(liSub);
            });

            liCat.appendChild(subUl);
            rootUl.appendChild(liCat);
        });

        slot.appendChild(rootUl);
        if (window.lucide) lucide.createIcons();
    },

    repopulateCategoryDropdown() {
        const select = document.getElementById("formPromptCategorySelect");
        if (!select) return;
        select.innerHTML = "";

        this.categories.forEach(cat => {
            if (cat.name === 'all') return;
            const opt = document.createElement("option");
            opt.value = cat.name;
            opt.innerText = cat.name;
            select.appendChild(opt);
        });
    },

    launchTargetModalOverlay(id) { document.getElementById(id).classList.add("open"); },
    closeOpenModals() { document.querySelectorAll(".system-modal-backdrop-overlay").forEach(m => m.classList.remove("open")); },

    openCategoryForm(oldName = null) {
        document.getElementById("categoryManagerModal").classList.remove("open");
        document.getElementById("categoryDataAssetForm").reset();
        
        let catObj = null;
        if (oldName) catObj = this.categories.find(c => c.name === oldName);

        document.getElementById("formOldCatName").value = oldName || "";
        document.getElementById("formNewCatName").value = oldName || "";
        
        if (catObj && catObj.colorMode === 'gradient') {
            this.toggleColorMode('gradient');
            const colors = catObj.colorValue.match(/#[a-zA-Z0-9]{6}/g);
            if (colors && colors.length >= 2) {
                document.getElementById("formNewCatColorGrad1").value = colors[0];
                document.getElementById("formNewCatColorGrad2").value = colors[1];
            }
        } else if (catObj) {
            this.toggleColorMode('solid');
            document.getElementById("formNewCatColorSolid").value = catObj.colorValue;
        } else {
            this.toggleColorMode('solid');
        }
        
        document.getElementById("categoryModalTitle").innerText = oldName ? "Edit Branch" : "Build Branch";
        document.getElementById("categorySubmitBtn").innerText = oldName ? "Update Branch" : "Inject Branch";

        this.updateCategoryPreview();
        this.launchTargetModalOverlay("categoryFormModal");
    },

    openPromptWriterModal(id = null) {
        document.getElementById("promptDataAssetForm").reset();
        this.repopulateCategoryDropdown();

        if (id) {
            const data = this.prompts.find(p => p.id === parseInt(id));
            if (!data) return;

            document.getElementById("promptModalTitle").innerText = "Modify Blueprint";
            document.getElementById("formPromptId").value = data.id;
            document.getElementById("formPromptTitle").value = data.title;
            document.getElementById("formPromptIcon").value = data.icon || "📝";
            document.getElementById("formPromptText").value = data.text;
            document.getElementById("formPromptCategorySelect").value = data.category;
            document.getElementById("formPromptSubCategory").value = data.subCategory;
        } else {
            document.getElementById("promptModalTitle").innerText = "Blueprint Core";
            document.getElementById("formPromptId").value = "";
            document.getElementById("formPromptIcon").value = "📝";
        }
        this.launchTargetModalOverlay("promptFormModal");
    },

    copyTextToBuffer(b64) {
        const str = decodeURIComponent(escape(atob(b64)));
        navigator.clipboard.writeText(str).then(() => this.dispatchToastAlert("Text copied to clipboard.", "success"));
    },

    dispatchToastAlert(msg, type = "info") {
        const hub = document.getElementById("toastNotificationHub");
        if (!hub) return;

        const icon = type === "success" ? "check-circle" : type === "warning" ? "alert-circle" : type === "error" ? "slash" : "info";
        const color = type === "success" ? "var(--mint-green-accent)" : type === "warning" ? "var(--soft-coral-accent)" : type === "error" ? "#ff4f4f" : "var(--premium-purple-accent)";
        const bar = document.createElement("div");
        bar.className = `toast-bar toast-${type}`;
        bar.innerHTML = `<i data-lucide="${icon}" style="width:18px; height:18px; color:${color};"></i> <span>${msg}</span>`;
        
        hub.appendChild(bar);
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            bar.style.animation = "toastSpringIn 0.35s reverse ease forwards";
            setTimeout(() => bar.remove(), 400);
        }, 3000);
    }
};

// Ensure AppEngine is reachable from inline HTML handlers and initialize
window.AppEngine = AppEngine;
document.addEventListener("DOMContentLoaded", () => {
    try {
        AppEngine.init();
    } catch (err) {
        console.error('AppEngine failed to initialize:', err);
    }
});
