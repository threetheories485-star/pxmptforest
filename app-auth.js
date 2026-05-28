/**
 * 📁 PXMPT FOREST — MASTER AUTHENTICATION ENGINE
 */

const AuthEngine = {
    authenticatedUser: null,
    authMode: 'login', // 'login' or 'signup'

    init() {
        const preservedToken = localStorage.getItem("forest_auth_token_v3");
        if (preservedToken) {
            this.authenticatedUser = JSON.parse(preservedToken);
        }
        this.evaluateGlobalAuthStateInterface();
    },

    /* --- STANDARD EMAIL/PASSWORD AUTHENTICATION --- */
    executeStandardAuth(e) {
        e.preventDefault();
        
        const nameInput = document.getElementById("authName").value.trim();
        const emailInput = document.getElementById("authEmail").value.trim();

        if (this.authMode === 'signup' && !nameInput) {
            if(typeof UIController !== 'undefined') UIController.dispatchToastAlert("Please provide your full name.", "warning");
            return;
        }

        if(typeof UIController !== 'undefined') UIController.dispatchToastAlert("Authenticating with secure server...", "info");

        // Simulate backend validation
        setTimeout(() => {
            this.authenticatedUser = {
                uid: "forest_user_" + Date.now(),
                name: this.authMode === 'signup' ? nameInput : "Techstaars Operator",
                email: emailInput,
                photoURL: "https://ui-avatars.com/api/?name=" + encodeURIComponent(this.authMode === 'signup' ? nameInput : emailInput) + "&background=7c4dff&color=fff"
            };
            
            localStorage.setItem("forest_auth_token_v3", JSON.stringify(this.authenticatedUser));
            this.evaluateGlobalAuthStateInterface();
            
            if (typeof UIController !== 'undefined') {
                UIController.closeOpenModals();
                UIController.dispatchToastAlert(`Vault synced. Welcome, ${this.authenticatedUser.name}!`, "success");
            }
        }, 800);
    },

    /* --- GOOGLE OAUTH SIMULATION --- */
    executeGoogleSignIn() {
        if(typeof UIController !== 'undefined') UIController.dispatchToastAlert("Connecting to Google Gateways...", "info");
        
        setTimeout(() => {
            this.authenticatedUser = {
                uid: "goog_oauth2_18292026_techstaars",
                name: "Techstaars Operator",
                email: "techstaars@gmail.com",
                photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
            };
            
            localStorage.setItem("forest_auth_token_v3", JSON.stringify(this.authenticatedUser));
            this.evaluateGlobalAuthStateInterface();
            
            if (typeof UIController !== 'undefined') {
                UIController.closeOpenModals();
                UIController.dispatchToastAlert(`Google Identity Linked. Welcome!`, "success");
            }
        }, 700);
    },

    executeSignOut() {
        this.authenticatedUser = null;
        localStorage.removeItem("forest_auth_token_v3");
        this.evaluateGlobalAuthStateInterface();
        
        if(typeof UIController !== 'undefined') {
            UIController.closeOpenModals();
            UIController.dispatchToastAlert("Successfully signed out.", "info");
        }
    },

    /* --- STATE EVALUATION & DOM POPULATION --- */
    evaluateGlobalAuthStateInterface() {
        const desktopHook = document.getElementById("desktopAuthSlot");
        const mobileHook = document.getElementById("mobileAuthSlot");
        const settingsBoxNode = document.getElementById("settingsAuthBtnSlot");
        
        if (this.authenticatedUser) {
            // USER IS LOGGED IN -> Show Avatar & Settings Profile
            const profileCapsule = `
                <div class="user-profile-identity-capsule" onclick="UIController.launchTargetModalOverlay('settingsPanelModal')" title="View Account">
                    <img src="${this.authenticatedUser.photoURL}" class="user-avatar-image-node" alt="Avatar">
                    <div class="user-label-strings">
                        <h5>${this.authenticatedUser.name}</h5>
                        <p style="color: var(--brutal-black-line); font-weight:700;">Account Settings</p>
                    </div>
                </div>
            `;
            if (desktopHook) desktopHook.innerHTML = profileCapsule;
            if (mobileHook) mobileHook.innerHTML = profileCapsule;

            // Populate the Settings Modal with User Data + Sign Out Button
            if (settingsBoxNode) {
                settingsBoxNode.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 20px;">
                        <img src="${this.authenticatedUser.photoURL}" style="width: 54px; height: 54px; border-radius: 50%; border: 3px solid var(--brutal-black-line); box-shadow: 2px 2px 0px var(--brutal-black-line);">
                        <div>
                            <h5 style="font-family: var(--font-heading); font-size: 18px; font-weight: 800; color: var(--text-charcoal-primary);">${this.authenticatedUser.name}</h5>
                            <p style="font-size: 13px; opacity: 0.7; margin-top: 2px;">${this.authenticatedUser.email}</p>
                        </div>
                    </div>
                    <button class="liquid-brutal-master-btn" style="background: var(--soft-coral-accent); color:#fff; width: 100%; justify-content: center;" onclick="AuthEngine.executeSignOut()">
                        <i data-lucide="log-out" style="width: 16px; height: 16px;"></i> Sign Out
                    </button>
                `;
            }
        } else {
            // USER IS LOGGED OUT -> Show "Sign In" Buttons
            const loginBtn = `
                <button class="liquid-brutal-master-btn" style="background: var(--neon-yellow-shadow); padding: 8px 16px; font-size:13px;" onclick="UIController.launchTargetModalOverlay('authModal')">
                    <i data-lucide="user" style="width: 15px; height: 15px;"></i> Sign In
                </button>
            `;
            if (desktopHook) desktopHook.innerHTML = loginBtn;
            if (mobileHook) mobileHook.innerHTML = loginBtn;

            // Populate Settings Modal prompting them to log in
            if (settingsBoxNode) {
                settingsBoxNode.innerHTML = `
                    <p style="font-size: 13px; font-weight: 600; color: var(--text-charcoal-primary); margin-bottom: 14px;">You are currently browsing the local vault as a guest.</p>
                    <button class="liquid-brutal-master-btn" style="background: var(--neon-yellow-shadow); width: 100%; justify-content: center;" onclick="UIController.closeOpenModals(); UIController.launchTargetModalOverlay('authModal')">
                        Log In or Sign Up
                    </button>
                `;
            }
        }

        if (window.lucide) lucide.createIcons();
    }
};

const AuthEngineUI = {
    switchTab(mode) {
        AuthEngine.authMode = mode;
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
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const authForm = document.getElementById("authGatewayForm");
    if(authForm) {
        authForm.addEventListener("submit", (e) => AuthEngine.executeStandardAuth(e));
    }
});