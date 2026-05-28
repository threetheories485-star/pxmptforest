/**
 * 📁 PXMPT FOREST — CENTRALIZED DATA ENGINE & MODULE CONFIG
 */

// --- FIREBASE WEB CONFIGURATION INITIALIZATION ANCHOR ---
// Drop your web app connection variables here when ready.
const FirebaseEnvironment = {
    apiKey: "YOUR_FIREBASE_API_KEY_HERE",
    authDomain: "YOUR_AUTH_DOMAIN_HERE",
    projectId: "YOUR_PROJECT_ID_HERE",
    storageBucket: "YOUR_STORAGE_BUCKET_HERE",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID_HERE",
    appId: "YOUR_APP_ID_HERE"
};

const MemoryStore = {
    prompts: [],
    categories: [],
    
    // Updated Seed Data including custom Emoji Icons
    fallbackPresets: {
        prompts: [
            { id: 1001, title: "Blog Post Generator", icon: "📝", text: "Create engaging blog posts with ease using this simple framework.", category: "Writing", subCategory: "SEO Content", liked: false },
            { id: 1002, title: "Social Media Caption", icon: "🎯", text: "Generate scroll-stopping captions for any platform.", category: "Marketing", subCategory: "Social Strategy", liked: false },
            { id: 1003, title: "Code Explainer", icon: "💻", text: "Explain any code snippet in simple terms.", category: "Development", subCategory: "Debugging", liked: false },
            { id: 1004, title: "Product Idea Validator", icon: "💡", text: "Validate your product idea instantly with key insights.", category: "Business", subCategory: "Startups", liked: false },
            { id: 1005, title: "Cold Email Writer", icon: "✉️", text: "Write high-converting cold emails that get replies.", category: "Marketing", subCategory: "Outreach", liked: false },
            { id: 1006, title: "YouTube Script Outline", icon: "🎥", text: "Create compelling YouTube script outlines in minutes.", category: "Writing", subCategory: "Video Content", liked: false }
        ],
        categories: [
            { name: "all", color: "#ffffff" },
            { name: "Writing", color: "#dfff4f" },      /* Neon Yellow */
            { name: "Marketing", color: "#32e27b" },    /* Mint Green */
            { name: "Development", color: "#3ebdff" },  /* Sky Blue */
            { name: "Business", color: "#ff6b6b" }      /* Coral */
        ]
    },

    init() {
        const localPrompts = localStorage.getItem("forest_prompts_v3");
        const localCategories = localStorage.getItem("forest_categories_v3");

        if (localPrompts) {
            this.prompts = JSON.parse(localPrompts);
        } else {
            this.prompts = [...this.fallbackPresets.prompts];
            this.savePromptsToStorage();
        }

        if (localCategories) {
            this.categories = JSON.parse(localCategories);
        } else {
            this.categories = [...this.fallbackPresets.categories];
            this.saveCategoriesToStorage();
        }
    },

    savePromptsToStorage() {
        localStorage.setItem("forest_prompts_v3", JSON.stringify(this.prompts));
    },

    saveCategoriesToStorage() {
        localStorage.setItem("forest_categories_v3", JSON.stringify(this.categories));
    },

    // --- CRUD FUNCTIONALITIES ---
    createNewPrompt(title, icon, text, category, subCategory) {
        const payload = {
            id: Date.now(),
            title: title.trim(),
            icon: icon.trim() || "📝",
            text: text.trim(),
            category,
            subCategory: subCategory.trim() || category,
            liked: false
        };
        this.prompts.unshift(payload);
        this.savePromptsToStorage();
        UIController.dispatchToastAlert("Prompt stored in Forest repository.", "success");
    },

    updatePromptRecord(id, title, icon, text, category, subCategory) {
        const targetId = parseInt(id);
        const matchIndex = this.prompts.findIndex(p => p.id === targetId);
        if (matchIndex !== -1) {
            this.prompts[matchIndex] = {
                ...this.prompts[matchIndex],
                title: title.trim(),
                icon: icon.trim() || "📝",
                text: text.trim(),
                category,
                subCategory: subCategory.trim() || category
            };
            this.savePromptsToStorage();
            UIController.dispatchToastAlert("Prompt blueprint updated.", "success");
        }
    },

    removePromptRecord(id) {
        const targetId = parseInt(id);
        this.prompts = this.prompts.filter(p => p.id !== targetId);
        this.savePromptsToStorage();
        UIController.dispatchToastAlert("Prompt record purged from root memory.", "info");
    },

    togglePromptLikeState(id) {
        const targetId = parseInt(id);
        const matchIndex = this.prompts.findIndex(p => p.id === targetId);
        if (matchIndex !== -1) {
            this.prompts[matchIndex].liked = !this.prompts[matchIndex].liked;
            this.savePromptsToStorage();
        }
    },

    insertCustomCategory(name, color) {
        const sanitizedName = name.trim();
        if (this.categories.some(c => c.name.toLowerCase() === sanitizedName.toLowerCase())) {
            UIController.dispatchToastAlert("Category label conflicts with existing branch.", "warning");
            return false;
        }
        this.categories.push({ name: sanitizedName, color });
        this.saveCategoriesToStorage();
        UIController.dispatchToastAlert(`Category Branch '${sanitizedName}' built.`, "success");
        return true;
    },

    purgeSystemDatabaseCache() {
        localStorage.clear();
        UIController.dispatchToastAlert("Local storage scrubbed. Re-indexing canvas...", "info");
        setTimeout(() => location.reload(), 750);
    }
};