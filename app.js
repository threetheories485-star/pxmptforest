/**
 * ==========================================================================
 * 📁 PXMPT FOREST — UNIFIED MASTER JAVASCRIPT ENGINE
 * ==========================================================================
 */

// --- FIREBASE CLOUD CONFIGURATION ---
// Paste your live credentials here when you are ready to switch from local to cloud.
const FirebaseEnvironment = {
apiKey: "AIzaSyCDnJh7GpOQnwccFWGEcwoQ71l8pVIZBQI",
    authDomain: "prompt-7914d.firebaseapp.com",
    projectId: "prompt-7914d",
    storageBucket: "prompt-7914d.firebasestorage.app",
    messagingSenderId: "848428533255",
    appId: "1:848428533255:web:b42f1a0c0e1278c1ae8ca2"

};

const AppEngine = {
    // --- 1. MEMORY STATE ---
    prompts: [],
    categories: [],
    authenticatedUser: null,
    auth: null,
    db: null,
    authMode: 'login', // 'login' or 'signup'
    
    filterState: {
        activeCategory: 'all',
        searchQuery: '',
        favoritesOnly: false
    },

    fallbackPresets: {
        prompts: [
            { id: 1001, title: "Blog Post Generator", icon: "📝", text: "Create engaging blog posts with ease using this simple framework.", category: "Writing", subCategory: "SEO Content", liked: false },
            { id: 1002, title: "Social Media Caption", icon: "🎯", text: "Generate scroll-stopping captions for any platform.", category: "Marketing", subCategory: "Social Strategy", liked: false },
            { id: 1003, title: "Code Explainer", icon: "💻", text: "Explain any code snippet in simple terms.", category: "Development", subCategory: "Debugging", liked: false },
            { id: 1004, title: "Product Idea Validator", icon: "💡", text: "Validate your product idea instantly with key insights.", category: "Business", subCategory: "Startups", liked: false }
        ],
        categories: [
            { name: "all", color: "#ffffff" },
            { name: "Writing", color: "#dfff4f" },      /* Neon Yellow */
            { name: "Marketing", color: "#32e27b" },    /* Mint Green */
            { name: "Development", color: "#3ebdff" },  /* Sky Blue */
            { name: "Business", color: "#ff6b6b" }      /* Coral */
        ],
        },

    // --- 2. INITIALIZATION ---
    // --- 2. INITIALIZATION & CLOUD SYNC ---
    init() {
        // Bind UI handlers first
        this.bindEvents();

        // Attempt to initialise Firebase (if configured) before attaching auth listeners
        this.initFirebase();

        // Use the initialized auth instance when available, otherwise fall back to local-only mode
        const authRef = this.auth || window.auth;
        if (authRef && typeof authRef.onAuthStateChanged === 'function') {
            authRef.onAuthStateChanged(async (user) => {
                if (user) {
                    // 🟢 USER LOGGED IN -> Load their Cloud Profile
                    this.authenticatedUser = {
                        uid: user.uid,
                        name: user.displayName || "Vault User",
                        email: user.email,
                        photoURL: user.photoURL || "https://ui-avatars.com/api/?name=" + encodeURIComponent(user.displayName || user.email) + "&background=7c4dff&color=fff"
                    };
                    await this.fetchCloudData(); // Pull data from Firestore
                } else {
                    // 🔴 USER LOGGED OUT -> Use Local Browser Data Only
                    this.authenticatedUser = null;
                    const localPrompts = localStorage.getItem("forest_prompts_v4");
                    const localCategories = localStorage.getItem("forest_categories_v4");
                    this.prompts = localPrompts ? JSON.parse(localPrompts) : [...this.fallbackPresets.prompts];
                    this.categories = localCategories ? JSON.parse(localCategories) : [...this.fallbackPresets.categories];
                    this.syncUI();
                }

                this.evaluateAuthState();
                this.switchViewport('home');
            });
        } else {
            // No Firebase auth available — hydrate from local storage and update UI
            this.authenticatedUser = JSON.parse(localStorage.getItem('forest_auth_token_v4')) || null;
            const localPrompts = localStorage.getItem("forest_prompts_v4");
            const localCategories = localStorage.getItem("forest_categories_v4");
            this.prompts = localPrompts ? JSON.parse(localPrompts) : [...this.fallbackPresets.prompts];
            this.categories = localCategories ? JSON.parse(localCategories) : [...this.fallbackPresets.categories];
            this.evaluateAuthState();
            this.switchViewport('home');
        }
    },

    // 🚀 NEW: PULL DATA FROM FIRESTORE
    async fetchCloudData() {
        if (!this.authenticatedUser) return;
        
        try {
            this.dispatchToastAlert("Syncing Vault with Cloud...", "info");
            // Look up the user's specific document in the database via this.db
            const dbRef = this.db || window.db;
            if (!dbRef) {
                this.dispatchToastAlert('No cloud database available.', 'warning');
                return;
            }
            const docRef = dbRef.collection("users").doc(this.authenticatedUser.uid);
            const docSnap = await docRef.get();
            
            if (docSnap.exists) {
                // Load their saved cloud data into the app
                const data = docSnap.data();
                this.prompts = Array.isArray(data.prompts) ? data.prompts : [];
                this.categories = Array.isArray(data.categories) ? data.categories : [];
                if (!this.categories.find(c => c.name === 'all')) {
                    this.categories.unshift({ name: 'all', color: '#ffffff' });
                }
                this.dispatchToastAlert("Cloud Sync Complete.", "success");
            } else {
                // First time logging in! Set up their cloud vault with default data
                this.prompts = [...this.fallbackPresets.prompts];
                this.categories = [...this.fallbackPresets.categories];
                await this.saveData(); 
            }
            this.syncUI(); // Refresh the screen with the loaded data
        } catch (error) {
            console.error("Cloud Sync Error:", error);
            this.dispatchToastAlert("Could not sync cloud data.", "warning");
        }
    },

    // 🚀 UPDATED: PUSH DATA TO FIRESTORE
    async saveData() {
        // 1. Always save a local backup for speed/offline mode
        localStorage.setItem("forest_prompts_v4", JSON.stringify(this.prompts));
        localStorage.setItem("forest_categories_v4", JSON.stringify(this.categories));

        // 2. If the user is logged in, push updates to Firebase!
        if (this.authenticatedUser && this.authenticatedUser.uid) {
            const dbRef = this.db || window.db;
            if (dbRef) {
                try {
                    await dbRef.collection("users").doc(this.authenticatedUser.uid).set({
                        prompts: this.prompts,
                        categories: this.categories,
                        updatedAt: (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue)
                            ? firebase.firestore.FieldValue.serverTimestamp()
                            : Date.now()
                    }, { merge: true });
                } catch (error) {
                    console.error("Cloud Save Error:", error);
                }
            }
        }
    },

    // --- 3. AUTHENTICATION LOGIC ---
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

    // Auth flow functions are declared later, after Firebase is initialized.


    // Initialize Firebase (compat) when a valid config is present and the SDK is loaded
    initFirebase() {
        try {
            const hasConfig = FirebaseEnvironment && FirebaseEnvironment.apiKey && !FirebaseEnvironment.apiKey.includes('YOUR');
            if (!hasConfig) {
                console.warn('Firebase configuration missing or invalid.');
                return;
            }

            if (window.firebase && !this.db) {
                try {
                    firebase.initializeApp(FirebaseEnvironment);
                } catch (e) {
                    // already initialized
                }

                this.auth = firebase.auth();
                this.db = firebase.firestore();
                window.auth = this.auth;
                window.db = this.db;

                if (this.auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
                    this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {
                        // persistence not supported in this environment
                    });
                }

                // Observe auth state changes to sync UI and load cloud data when signed in
                this.auth.onAuthStateChanged(async (user) => {
                    if (user) {
                        this.authenticatedUser = {
                            uid: user.uid,
                            name: user.displayName || 'Vault User',
                            email: user.email,
                            photoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=7c4dff&color=fff`
                        };
                        localStorage.setItem("forest_auth_token_v4", JSON.stringify(this.authenticatedUser));
                        await this.fetchCloudData();
                    } else {
                        this.authenticatedUser = null;
                    }
                    this.evaluateAuthState();
                });
            }
        } catch (err) {
            console.warn('Firebase init skipped', err);
        }
    },

    // Simple debounce helper
    debounce(fn, wait = 180) {
        let t = null;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn.apply(this, args), wait);
        };
    },

    // 🚀 REAL FIREBASE EMAIL & PASSWORD AUTH
    async executeStandardAuth(e) {
        e.preventDefault();
        const nameInput = document.getElementById("authName").value.trim();
        const emailInput = document.getElementById("authEmail").value.trim();
        const passInput = document.getElementById("authPassword").value.trim();

        if (this.authMode === 'signup' && !nameInput) {
            this.dispatchToastAlert("Please provide your full name.", "warning");
            return;
        }

        this.dispatchToastAlert("Authenticating...", "info");
        const submitBtn = document.getElementById("authSubmitBtn");
        if (submitBtn) submitBtn.disabled = true;

        const authInstance = this.auth || window.auth;
        if (authInstance && window.firebase) {
            try {
                if (authInstance.setPersistence && firebase.auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
                    await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                }

                let userCredential;
                if (this.authMode === 'signup') {
                    userCredential = await authInstance.createUserWithEmailAndPassword(emailInput, passInput);
                    await userCredential.user.updateProfile({ displayName: nameInput });
                } else {
                    userCredential = await authInstance.signInWithEmailAndPassword(emailInput, passInput);
                }

                const fallbackAvatar = "https://ui-avatars.com/api/?name=" + encodeURIComponent(userCredential.user.displayName || emailInput) + "&background=7c4dff&color=fff";
                this.authenticatedUser = {
                    uid: userCredential.user.uid,
                    name: userCredential.user.displayName || nameInput || "Vault User",
                    email: userCredential.user.email,
                    photoURL: userCredential.user.photoURL || fallbackAvatar
                };

                localStorage.setItem("forest_auth_token_v4", JSON.stringify(this.authenticatedUser));
                await this.fetchCloudData();
                this.closeOpenModals();
                this.evaluateAuthState();
                this.dispatchToastAlert(`Vault Synced. Welcome, ${this.authenticatedUser.name}!`, "success");
            } catch (error) {
                this.dispatchToastAlert(error.message || 'Authentication failed', "warning");
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        } else {
            // Local fallback (no Firebase configured) — preserves current UX
            setTimeout(() => {
                this.authenticatedUser = {
                    uid: "forest_user_" + Date.now(),
                    name: this.authMode === 'signup' ? nameInput : "Local Vault User",
                    email: emailInput,
                    photoURL: "https://ui-avatars.com/api/?name=" + encodeURIComponent(this.authMode === 'signup' ? nameInput : emailInput) + "&background=7c4dff&color=fff"
                };
                localStorage.setItem("forest_auth_token_v4", JSON.stringify(this.authenticatedUser));
                this.closeOpenModals();
                this.evaluateAuthState();
                this.dispatchToastAlert(`Vault Synced. Welcome!`, "success");
                if (submitBtn) submitBtn.disabled = false;
            }, 700);
        }
    },

    // 🚀 REAL FIREBASE GOOGLE AUTH
    async executeGoogleSignIn() {
        this.dispatchToastAlert("Opening Google Secure Gateway...", "info");
        const authInstance = this.auth || window.auth;
        if (authInstance && window.firebase) {
            try {
                if (authInstance.setPersistence && firebase.auth && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
                    await authInstance.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
                }
                const provider = new firebase.auth.GoogleAuthProvider();
                const userCredential = await authInstance.signInWithPopup(provider);
                this.authenticatedUser = {
                    uid: userCredential.user.uid,
                    name: userCredential.user.displayName || 'Google User',
                    email: userCredential.user.email,
                    photoURL: userCredential.user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userCredential.user.displayName || userCredential.user.email)}&background=7c4dff&color=fff`
                };
                localStorage.setItem("forest_auth_token_v4", JSON.stringify(this.authenticatedUser));
                await this.fetchCloudData();
                this.closeOpenModals();
                this.evaluateAuthState();
                this.dispatchToastAlert(`Google Identity Linked. Welcome!`, "success");
            } catch (error) {
                this.dispatchToastAlert(error.message || "Google Sign-In Cancelled or Failed.", "warning");
            }
        } else {
            // Fallback simulated OAuth (local only)
            setTimeout(() => {
                this.authenticatedUser = {
                    uid: "goog_oauth2_local_" + Date.now(),
                    name: "Local Google User",
                    email: "user@local.google",
                    photoURL: "https://ui-avatars.com/api/?name=Local+Google&background=7c4dff&color=fff"
                };
                localStorage.setItem("forest_auth_token_v4", JSON.stringify(this.authenticatedUser));
                this.closeOpenModals();
                this.evaluateAuthState();
                this.dispatchToastAlert(`Google Identity Linked. Welcome!`, "success");
            }, 600);
        }
    },

    // 🚀 REAL FIREBASE SIGN OUT
    async executeSignOut() {
        try {
            const authInstance = this.auth || window.auth;
            if (authInstance) await authInstance.signOut();
            this.authenticatedUser = null;
            localStorage.removeItem("forest_auth_token_v4");
            this.closeOpenModals();
            this.evaluateAuthState();
            this.dispatchToastAlert("Successfully signed out.", "info");
        } catch (error) {
            this.dispatchToastAlert("Error signing out.", "warning");
        }
    },

    evaluateAuthState() {
        const headerHook = document.getElementById("headerAuthSlot");
        const settingsHook = document.getElementById("settingsAuthBtnSlot");

        if (this.authenticatedUser) {
            if (headerHook) {
                headerHook.innerHTML = `
                    <div class="user-profile-identity-capsule" onclick="AppEngine.launchTargetModalOverlay('settingsPanelModal')" title="View Account">
                        <img src="${this.authenticatedUser.photoURL}" class="user-avatar-image-node" alt="Avatar">
                        <div class="user-label-strings">
                            <h5>${this.authenticatedUser.name}</h5>
                            <p style="color: var(--brutal-black-line); font-weight:700;">Account Settings</p>
                        </div>
                    </div>
                `;
            }
            if (settingsHook) {
                settingsHook.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                        <img src="${this.authenticatedUser.photoURL}" style="width: 54px; height: 54px; border-radius: 50%; border: 3px solid var(--brutal-black-line); box-shadow: 2px 2px 0px var(--brutal-black-line);">
                        <div>
                            <h5 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: var(--text-charcoal-primary);">${this.authenticatedUser.name}</h5>
                            <p style="font-size: 13px; opacity: 0.7; margin-top: 2px;">${this.authenticatedUser.email}</p>
                        </div>
                    </div>
                    <button class="liquid-brutal-master-btn" style="background: var(--soft-coral-accent); color:#fff; width: 100%; justify-content: center;" onclick="AppEngine.executeSignOut()">
                        <i data-lucide="log-out" style="width: 16px; height: 16px;"></i> Sign Out
                    </button>
                `;
            }
        } else {
            if (headerHook) {
                headerHook.innerHTML = `
                    <button class="liquid-brutal-master-btn" style="background: var(--neon-yellow-shadow); padding: 8px 16px; font-size:13px;" onclick="AppEngine.launchTargetModalOverlay('authModal')">
                        <i data-lucide="user" style="width: 15px; height: 15px;"></i> Sign In
                    </button>
                `;
            }
            if (settingsHook) {
                settingsHook.innerHTML = `
                    <p style="font-size: 13px; font-weight: 600; margin-bottom: 14px;">You are currently browsing the local vault as a guest.</p>
                    <button class="liquid-brutal-master-btn" style="background: var(--neon-yellow-shadow); width: 100%; justify-content: center;" onclick="AppEngine.closeOpenModals(); AppEngine.launchTargetModalOverlay('authModal')">
                        Log In or Sign Up
                    </button>
                `;
            }
        }
        if (window.lucide) lucide.createIcons();
        this.syncUI();
    },

    // --- 4. DATA MUTATION ---
    async handlePromptSubmit(e) {
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

        await this.saveData();
        this.closeOpenModals();
        this.syncUI();
    },

    async handleCategorySubmit(e) {
        e.preventDefault();
        const oldName = document.getElementById("formOldCatName").value.trim();
        const name = document.getElementById("formNewCatName").value.trim();
        const colorType = document.querySelector('input[name="categoryColorType"]:checked')?.value || 'solid';
        const solidColor = document.getElementById("formNewCatColor").value;
        const gradientFrom = document.getElementById("formGradientFrom").value;
        const gradientTo = document.getElementById("formGradientTo").value;
        const gradientDirection = document.getElementById("formGradientDirection").value;

        const color = colorType === 'gradient'
            ? `linear-gradient(${gradientDirection}, ${gradientFrom}, ${gradientTo})`
            : solidColor;

        if (!name) {
            this.dispatchToastAlert("Please provide a valid category name.", "warning");
            return;
        }

        const duplicate = this.categories.some(c => c.name.toLowerCase() === name.toLowerCase() && c.name !== oldName);
        if (duplicate) {
            this.dispatchToastAlert("Category exists.", "warning");
            return;
        }

        if (oldName) {
            const categoryIndex = this.categories.findIndex(c => c.name === oldName);
            if (categoryIndex !== -1) {
                this.categories[categoryIndex] = { name, color };
                this.prompts = this.prompts.map(prompt => {
                    if (prompt.category === oldName) {
                        return { ...prompt, category: name, subCategory: prompt.subCategory === oldName ? name : prompt.subCategory };
                    }
                    return prompt;
                });
                this.dispatchToastAlert(`Branch '${oldName}' updated to '${name}'.`, "success");
            }
        } else {
            this.categories.push({ name, color });
            this.dispatchToastAlert(`Branch '${name}' built.`, "success");
        }

        await this.saveData();
        this.closeOpenModals();
        this.syncUI();
        this.renderCategoryManagerList();
    },

    async executeCardPurge(id) {
        this.prompts = this.prompts.filter(p => p.id !== parseInt(id));
        await this.saveData();
        this.syncUI();
        this.dispatchToastAlert("Record purged.", "info");
    },

    async toggleCardFavoritedState(id) {
        const index = this.prompts.findIndex(p => p.id === parseInt(id));
        if (index !== -1) {
            this.prompts[index].liked = !this.prompts[index].liked;
            await this.saveData();
            this.syncUI();
        }
    },

    purgeSystemDatabaseCache() {
        localStorage.clear();
        this.dispatchToastAlert("Wiping System Memory...", "info");
        setTimeout(() => location.reload(), 750);
    },

    // --- 5. UI EVENT ROUTING ---
    bindEvents() {
        const searchInput = document.getElementById("promptSearchField");
        if (searchInput) {
            const handler = this.debounce((e) => {
                this.filterState.searchQuery = e.target.value;
                this.renderPrompts();
            }, 160);
            searchInput.addEventListener("input", handler);
        }

        document.getElementById("authGatewayForm").addEventListener("submit", (e) => this.executeStandardAuth(e));
        document.getElementById("promptDataAssetForm").addEventListener("submit", (e) => this.handlePromptSubmit(e));
        document.getElementById("categoryDataAssetForm").addEventListener("submit", (e) => this.handleCategorySubmit(e));

        const categoryManagerBtn = document.getElementById("openCategoryManagerBtn");
        if (categoryManagerBtn) {
            categoryManagerBtn.addEventListener("click", () => {
                this.renderCategoryManagerList();
                this.launchTargetModalOverlay("categoryManagerModal");
            });
        }

        // Unified Bottom Dock Routing
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

    // --- 6. RENDER ENGINES ---
    renderCategories() {
        const track = document.getElementById("categoryPillTrack");
        if (!track) return;
        track.innerHTML = "";

        const fragment = document.createDocumentFragment();
        this.categories.forEach(category => {
            const count = category.name === 'all'
                ? this.prompts.length
                : this.prompts.filter(p => p.category === category.name).length;

            const isActive = this.filterState.activeCategory === category.name;
            const pill = document.createElement("div");
            pill.className = `category-selection-gel-pill ${isActive ? 'active' : ''}`;
            pill.style.background = category.name === 'all' ? '#ffffff' : category.color;
            pill.style.color = 'var(--text-charcoal-primary)';
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
            fragment.appendChild(pill);
        });

        track.appendChild(fragment);
    },

    renderPrompts() {
        const grid = document.getElementById("promptsGridContainer");
        if (!grid) return;
        grid.innerHTML = "";

        const frag = document.createDocumentFragment();

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
                    <i data-lucide="help-circle" style="margin: 0 auto 14px auto; width: 48px; height: 48px; stroke-width: 1.5;"></i>
                    <p>No operational blueprints match the current filtering parameters.</p>
                </div>
            `;
            requestAnimationFrame(() => { if (window.lucide) lucide.createIcons(); });
            return;
        }

        // If dataset small, render synchronously; otherwise chunk-render to keep UI responsive
        const CHUNK_SIZE = 12;
        if (activeDataset.length <= CHUNK_SIZE) {
            activeDataset.forEach(prompt => {
                const categoryData = this.categories.find(c => c.name === prompt.category) || { color: '#ffffff' };
                const safePayload = btoa(unescape(encodeURIComponent(prompt.text)));
                const wrapper = document.createElement("div");
                wrapper.className = "gel-molded-prompt-card";
                wrapper.innerHTML = `
                    <div class="card-header-bar" style="background-color: ${categoryData.color};">
                        <div class="card-header-left-cluster">
                            <div class="card-custom-icon-box">${prompt.icon}</div>
                            <span class="card-header-title">${prompt.title}</span>
                        </div>
                        <div class="card-action-utilities-mesh">
                            <button class="card-micro-action-btn" onclick="AppEngine.openPromptWriterModal(${prompt.id})" title="Edit Blueprint"><i data-lucide="pencil" style="width: 14px; height: 14px;"></i></button>
                            <button class="card-micro-action-btn" style="color: #444;" onclick="AppEngine.executeCardPurge(${prompt.id})" title="Purge Record"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                        </div>
                    </div>
                    <div class="card-textual-body"><p>${prompt.text}</p></div>
                    <div class="card-lower-row">
                        <span class="card-category-tag-pill">${prompt.subCategory}</span>
                        <div class="card-footer-tray-actions">
                            <button class="tray-action-btn-node" onclick="AppEngine.toggleCardFavoritedState(${prompt.id})" title="Like Blueprint"><i data-lucide="heart" style="width: 18px; height: 18px; ${prompt.liked ? 'fill: var(--premium-purple-accent); stroke: var(--premium-purple-accent);' : ''}"></i></button>
                            <button class="tray-action-btn-node" onclick="AppEngine.copyTextToBuffer('${safePayload}')" title="Copy Raw String"><i data-lucide="copy" style="width: 18px; height: 18px;"></i></button>
                            <button class="tray-action-btn-node" onclick="AppEngine.generateShareTokenLink(${prompt.id})" title="Copy Share Link"><i data-lucide="more-vertical" style="width: 18px; height: 18px;"></i></button>
                        </div>
                    </div>
                `;
                frag.appendChild(wrapper);
            });
            grid.appendChild(frag);
            requestAnimationFrame(() => { if (window.lucide) lucide.createIcons(); });
            return;
        }

        // Chunked rendering for large datasets
        let index = 0;
        const renderChunk = (deadline) => {
            const end = Math.min(index + CHUNK_SIZE, activeDataset.length);
            for (; index < end; index++) {
                const prompt = activeDataset[index];
                const categoryData = this.categories.find(c => c.name === prompt.category) || { color: '#ffffff' };
                const safePayload = btoa(unescape(encodeURIComponent(prompt.text)));
                const wrapper = document.createElement("div");
                wrapper.className = "gel-molded-prompt-card";
                wrapper.innerHTML = `
                    <div class="card-header-bar" style="background-color: ${categoryData.color};">
                        <div class="card-header-left-cluster">
                            <div class="card-custom-icon-box">${prompt.icon}</div>
                            <span class="card-header-title">${prompt.title}</span>
                        </div>
                        <div class="card-action-utilities-mesh">
                            <button class="card-micro-action-btn" onclick="AppEngine.openPromptWriterModal(${prompt.id})" title="Edit Blueprint"><i data-lucide="pencil" style="width: 14px; height: 14px;"></i></button>
                            <button class="card-micro-action-btn" style="color: #444;" onclick="AppEngine.executeCardPurge(${prompt.id})" title="Purge Record"><i data-lucide="trash-2" style="width: 14px; height: 14px;"></i></button>
                        </div>
                    </div>
                    <div class="card-textual-body"><p>${prompt.text}</p></div>
                    <div class="card-lower-row">
                        <span class="card-category-tag-pill">${prompt.subCategory}</span>
                        <div class="card-footer-tray-actions">
                            <button class="tray-action-btn-node" onclick="AppEngine.toggleCardFavoritedState(${prompt.id})" title="Like Blueprint"><i data-lucide="heart" style="width: 18px; height: 18px; ${prompt.liked ? 'fill: var(--premium-purple-accent); stroke: var(--premium-purple-accent);' : ''}"></i></button>
                            <button class="tray-action-btn-node" onclick="AppEngine.copyTextToBuffer('${safePayload}')" title="Copy Raw String"><i data-lucide="copy" style="width: 18px; height: 18px;"></i></button>
                            <button class="tray-action-btn-node" onclick="AppEngine.generateShareTokenLink(${prompt.id})" title="Copy Share Link"><i data-lucide="more-vertical" style="width: 18px; height: 18px;"></i></button>
                        </div>
                    </div>
                `;
                frag.appendChild(wrapper);
            }
            grid.appendChild(frag);

            if (index < activeDataset.length) {
                // schedule next chunk
                if ('requestIdleCallback' in window) requestIdleCallback(renderChunk, { timeout: 200 });
                else setTimeout(() => renderChunk(), 40);
            } else {
                requestAnimationFrame(() => { if (window.lucide) lucide.createIcons(); });
            }
        };

        // start chunked render
        if ('requestIdleCallback' in window) requestIdleCallback(renderChunk, { timeout: 200 });
        else setTimeout(() => renderChunk(), 20);
    },

    renderForestMap() {
        const slot = document.getElementById("forestTreeMapSlot");
        if (!slot) return;
        slot.innerHTML = "";

        const mapData = {};
        this.categories.forEach(cat => {
            if (cat.name === 'all') return;
            mapData[cat.name] = { color: cat.color, subCategories: {} };
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
            liCat.innerHTML = `
                <div class="tree-card-label" style="border-left: 8px solid ${catNode.color}">
                    <i data-lucide="folder" style="width:18px; height:18px; color: ${catNode.color}"></i>
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
                    <div class="tree-card-label" style="font-size: 14px; padding: 10px 16px;">
                        <i data-lucide="corner-down-right" style="width:16px; height:16px;"></i>
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
                        <div class="tree-prompt-card" onclick="AppEngine.copyTextToBuffer('${payload}')">
                            <div class="tree-card-icon">${p.icon}</div>
                            <span>${p.title}</span>
                            <i data-lucide="copy" style="width:14px; height:14px; margin-left:auto; opacity:0.5;"></i>
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

    updateCategoryColorPreview() {
        const mode = document.querySelector('input[name="categoryColorType"]:checked')?.value || 'solid';
        const preview = document.getElementById("categoryColorPreview");
        if (!preview) return;

        if (mode === 'gradient') {
            const from = document.getElementById("formGradientFrom").value;
            const to = document.getElementById("formGradientTo").value;
            const direction = document.getElementById("formGradientDirection").value;
            preview.style.background = `linear-gradient(${direction}, ${from}, ${to})`;
            document.getElementById("gradientOptions").style.display = "block";
        } else {
            const color = document.getElementById("formNewCatColor").value;
            preview.style.background = color;
            document.getElementById("gradientOptions").style.display = "none";
        }
    },

    openCategoryForm(editPayload = null) {
        const form = document.getElementById("categoryDataAssetForm");
        if (!form) return;

        form.reset();
        document.getElementById("formOldCatName").value = "";
        document.getElementById("categoryModalTitle").innerText = "Add Category";
        document.getElementById("categorySubmitBtn").innerText = "Save Category";
        document.querySelector('input[name="categoryColorType"][value="solid"]').checked = true;
        document.getElementById("gradientOptions").style.display = "none";

        if (editPayload) {
            const gradientMode = typeof editPayload.color === 'string' && editPayload.color.startsWith('linear-gradient');
            document.getElementById("formOldCatName").value = editPayload.name;
            document.getElementById("formNewCatName").value = editPayload.name;

            if (gradientMode) {
                document.querySelector('input[name="categoryColorType"][value="gradient"]').checked = true;
                document.getElementById("gradientOptions").style.display = "block";
                document.getElementById("categoryModalTitle").innerText = "Edit Category";
                document.getElementById("categorySubmitBtn").innerText = "Update Category";
            } else {
                document.getElementById("formNewCatColor").value = editPayload.color || "#dfff4f";
                document.getElementById("categoryModalTitle").innerText = "Edit Category";
                document.getElementById("categorySubmitBtn").innerText = "Update Category";
            }
        }

        this.updateCategoryColorPreview();
        this.closeOpenModals();
        this.launchTargetModalOverlay("categoryFormModal");
    },

    renderCategoryManagerList() {
        const slot = document.getElementById("categoryManagerListSlot");
        if (!slot) return;
        slot.innerHTML = "";

        const categories = this.categories.filter(c => c.name !== 'all');
        if (categories.length === 0) {
            slot.innerHTML = `<div style="padding: 24px; text-align:center; color:var(--text-charcoal-secondary);">No custom categories yet. Add one to organize your prompts.</div>`;
            return;
        }

        categories.forEach(category => {
            const item = document.createElement("div");
            item.className = "category-manager-item";

            const left = document.createElement("div");
            left.className = "category-manager-item-left";
            left.innerHTML = `
                <span class="category-color-dot" style="background: ${category.color};"></span>
                <span>${category.name}</span>
            `;

            const actions = document.createElement("div");
            actions.className = "category-manager-actions";

            const editBtn = document.createElement("button");
            editBtn.type = "button";
            editBtn.className = "liquid-brutal-master-btn";
            editBtn.style.cssText = "padding: 8px 12px; font-size: 12px; background: var(--soft-coral-accent); color:#fff;";
            editBtn.innerText = "Edit";
            editBtn.addEventListener("click", () => this.openCategoryForm(category));

            const deleteBtn = document.createElement("button");
            deleteBtn.type = "button";
            deleteBtn.className = "liquid-brutal-master-btn";
            deleteBtn.style.cssText = "padding: 8px 12px; font-size: 12px; background: #666; color:#fff;";
            deleteBtn.innerText = "Delete";
            deleteBtn.addEventListener("click", () => this.deleteCategory(category.name));

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            item.appendChild(left);
            item.appendChild(actions);
            slot.appendChild(item);
        });
    },

    deleteCategory(name) {
        this.categories = this.categories.filter(c => c.name !== name && c.name !== 'all');
        this.prompts = this.prompts.map(prompt => {
            if (prompt.category === name) return { ...prompt, category: 'all', subCategory: 'all' };
            return prompt;
        });

        this.saveData();
        this.syncUI();
        this.renderCategoryManagerList();
        this.dispatchToastAlert(`Branch '${name}' deleted.`, "info");
    },

    // --- 7. MODALS & UTILITIES ---
    launchTargetModalOverlay(id) { document.getElementById(id).classList.add("open"); },
    closeOpenModals() { document.querySelectorAll(".system-modal-backdrop-overlay").forEach(m => m.classList.remove("open")); },

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
            document.getElementById("promptModalTitle").innerText = "Create Prompt Blueprint";
            document.getElementById("formPromptId").value = "";
            document.getElementById("formPromptIcon").value = "📝";
        }
        this.launchTargetModalOverlay("promptFormModal");
    },

    copyTextToBuffer(b64) {
        const str = decodeURIComponent(escape(atob(b64)));
        navigator.clipboard.writeText(str).then(() => this.dispatchToastAlert("Copied to clipboard.", "success"));
    },

    generateShareTokenLink(id) {
        const url = `${window.location.origin}/share/vault?promptId=${id}`;
        navigator.clipboard.writeText(url).then(() => this.dispatchToastAlert("Share Link generated.", "success"));
    },

    dispatchToastAlert(msg, type = "info") {
        const hub = document.getElementById("toastNotificationHub");
        if (!hub) return;

        const bar = document.createElement("div");
        bar.className = "toast-bar";
        bar.innerHTML = `<i data-lucide="info" style="width:16px; height:16px; color:var(--premium-purple-accent);"></i> <span>${msg}</span>`;
        
        hub.appendChild(bar);
        if (window.lucide) lucide.createIcons();

        setTimeout(() => {
            bar.style.animation = "toastSpringIn 0.35s reverse ease forwards";
            setTimeout(() => bar.remove(), 400);
        }, 3000);
    }
};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => AppEngine.init());
