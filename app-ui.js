/**
 * 📁 PXMPT FOREST — MASTER UI & COMPONENT CONTROLLER
 */

const AppFilterMatrix = {
    activeCategory: 'all',
    searchQuery: '',
    favoritesOnly: false
};

const UIController = {
    
    init() {
        MemoryStore.init();
        if(typeof AuthEngine !== 'undefined') AuthEngine.init();

        this.bindGlobalEventRouting();
        this.syncMasterDataInterface();
        
        // App now defaults directly to the Home Viewport allowing local browsing instantly
        this.switchViewport('home'); 
    },

    bindGlobalEventRouting() {
        // Search Input Engine
        const searchInput = document.getElementById("promptSearchField");
        if (searchInput) {
            searchInput.addEventListener("input", (e) => {
                AppFilterMatrix.searchQuery = e.target.value;
                this.renderMasterPromptGrid();
            });
        }

        // Prompt Form Submission
        document.getElementById("promptDataAssetForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const id = document.getElementById("formPromptId").value;
            const title = document.getElementById("formPromptTitle").value;
            const icon = document.getElementById("formPromptIcon").value;
            const text = document.getElementById("formPromptText").value;
            const category = document.getElementById("formPromptCategorySelect").value;
            const subCategory = document.getElementById("formPromptSubCategory").value;

            if (id) {
                MemoryStore.updatePromptRecord(id, title, icon, text, category, subCategory);
            } else {
                MemoryStore.createNewPrompt(title, icon, text, category, subCategory);
            }
            
            this.closeOpenModals();
            this.syncMasterDataInterface();
            if(document.getElementById("foldersViewPort").classList.contains("active-viewport")) {
                this.renderForestTreeMap(); 
            }
        });

        // Category Form Submission
        document.getElementById("categoryDataAssetForm").addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("formNewCatName").value;
            const color = document.getElementById("formNewCatColor").value;

            if (MemoryStore.insertCustomCategory(name, color)) {
                this.closeOpenModals();
                this.syncMasterDataInterface();
            }
        });

        // Top Drawer Manage Action
        document.getElementById("openCategoryManagerBtn").addEventListener("click", () => {
            document.getElementById("categoryDataAssetForm").reset();
            this.launchTargetModalOverlay("categoryFormModal");
        });

        // Navigation Router & Viewport Switching
        const interfaceActionMap = [
            { dockId: "dockHome", sideId: "pcMenuHome", action: () => { 
                AppFilterMatrix.favoritesOnly = false; 
                this.switchViewport('home'); 
            }},
            { dockId: "dockFavs", sideId: "pcMenuFavs", action: () => { 
                AppFilterMatrix.favoritesOnly = true; 
                this.switchViewport('home'); 
            }},
            { dockId: "dockFolders", sideId: "pcMenuFolders", action: () => { 
                this.switchViewport('folders'); 
                this.renderForestTreeMap(); 
            }},
            { dockId: "dockSettings", sideId: "pcMenuSettings", action: () => { 
                this.launchTargetModalOverlay("settingsPanelModal"); 
            }}
        ];

        interfaceActionMap.forEach(route => {
            const dockNode = document.getElementById(route.dockId);
            const sideNode = document.getElementById(route.sideId);

            const executionPipeline = () => {
                document.querySelectorAll('.dock-link-item, .sidebar-btn').forEach(node => node.classList.remove('active'));
                if (dockNode) dockNode.classList.add('active');
                if (sideNode) sideNode.classList.add('active');
                route.action();
                this.renderMasterPromptGrid();
            };

            if (dockNode) dockNode.addEventListener("click", executionPipeline);
            if (sideNode) sideNode.addEventListener("click", executionPipeline);
        });

        // Master Floating Add Button
        const masterAddBtn = document.getElementById("dockAddPrompt");
        if (masterAddBtn) {
            masterAddBtn.addEventListener("click", () => this.openPromptWriterModal());
        }
    },

    /* --- VIEWPORT ENGINE --- */
    switchViewport(view) {
        const homeView = document.getElementById("homeViewPort");
        const foldersView = document.getElementById("foldersViewPort");

        [homeView, foldersView].forEach(v => {
            if(v) {
                v.classList.remove("active-viewport");
                v.classList.add("hidden-viewport");
            }
        });

        const targetView = document.getElementById(view + "ViewPort");
        if(targetView) {
            targetView.classList.remove("hidden-viewport");
            targetView.classList.add("active-viewport");
        }
    },

    syncMasterDataInterface() {
        this.renderCategoryCarousel();
        this.renderMasterPromptGrid();
        this.repopulateFormDropdownSelect();
    },

    /* --- DOM RENDER ENGINES --- */
    renderCategoryCarousel() {
        const carouselTrack = document.getElementById("categoryPillTrack");
        if (!carouselTrack) return;
        carouselTrack.innerHTML = "";

        MemoryStore.categories.forEach(category => {
            let volumeCount = category.name === 'all' 
                ? MemoryStore.prompts.length 
                : MemoryStore.prompts.filter(p => p.category === category.name).length;

            const isActive = AppFilterMatrix.activeCategory === category.name;
            const pillNode = document.createElement("div");
            
            pillNode.className = `category-selection-gel-pill ${isActive ? 'active' : ''}`;
            pillNode.style.backgroundColor = category.name === 'all' ? '#ffffff' : category.color;
            pillNode.style.color = 'var(--text-charcoal-primary)';
            
            pillNode.innerHTML = `
                <span>${category.name === 'all' ? 'All' : category.name}</span>
                <span class="pill-quantity-string">${volumeCount} Elements</span>
            `;
            
            pillNode.addEventListener("click", () => {
                document.querySelectorAll(".category-selection-gel-pill").forEach(c => c.classList.remove("active"));
                pillNode.classList.add("active");
                AppFilterMatrix.activeCategory = category.name;
                this.renderMasterPromptGrid();
            });

            carouselTrack.appendChild(pillNode);
        });
    },

    renderMasterPromptGrid() {
        const gridCanvas = document.getElementById("promptsGridContainer");
        if (!gridCanvas) return;
        gridCanvas.innerHTML = "";

        let activeDataset = MemoryStore.prompts.filter(item => {
            const queryMatch = item.title.toLowerCase().includes(AppFilterMatrix.searchQuery.toLowerCase()) || 
                               item.text.toLowerCase().includes(AppFilterMatrix.searchQuery.toLowerCase());
            const categoryMatch = AppFilterMatrix.activeCategory === 'all' || item.category === AppFilterMatrix.activeCategory;
            const favoriteMatch = !AppFilterMatrix.favoritesOnly || item.liked;
            return queryMatch && categoryMatch && favoriteMatch;
        });

        if (activeDataset.length === 0) {
            gridCanvas.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 70px 20px; font-weight: 700; opacity: 0.5;">
                    <i data-lucide="help-circle" style="margin: 0 auto 14px auto; width: 48px; height: 48px; stroke-width: 1.5;"></i>
                    <p>No operational blueprints match the current filtering parameters.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        activeDataset.forEach(prompt => {
            const categoryData = MemoryStore.categories.find(c => c.name === prompt.category) || { color: '#ffffff' };
            const encodedPayload = btoa(unescape(encodeURIComponent(prompt.text)));
            
            const cardWrapper = document.createElement("div");
            cardWrapper.className = "gel-molded-prompt-card";
            
            cardWrapper.innerHTML = `
                <div class="card-header-bar" style="background-color: ${categoryData.color};">
                    <div class="card-header-left-cluster">
                        <div class="card-custom-icon-box">${prompt.icon}</div>
                        <span class="card-header-title">${prompt.title}</span>
                    </div>
                    
                    <div class="card-action-utilities-mesh">
                        <button class="card-micro-action-btn" onclick="UIController.openPromptWriterModal(${prompt.id})" title="Edit Blueprint">
                            <i data-lucide="pencil" style="width: 14px; height: 14px;"></i>
                        </button>
                        <button class="card-micro-action-btn" style="color: #444;" onclick="UIController.executeCardPurge(${prompt.id})" title="Purge Record">
                            <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                        </button>
                    </div>
                </div>
                
                <div class="card-textual-body">
                    <p>${prompt.text}</p>
                </div>
                
                <div class="card-lower-row">
                    <span class="card-category-tag-pill">${prompt.subCategory}</span>
                    <div class="card-footer-tray-actions">
                        <button class="tray-action-btn-node" onclick="UIController.toggleCardFavoritedState(${prompt.id})" title="Like Blueprint">
                            <i data-lucide="heart" style="width: 18px; height: 18px; ${prompt.liked ? 'fill: var(--premium-purple-accent); stroke: var(--premium-purple-accent);' : ''}"></i>
                        </button>
                        <button class="tray-action-btn-node" onclick="UIController.copyTextToBuffer('${encodedPayload}')" title="Copy Raw String">
                            <i data-lucide="copy" style="width: 18px; height: 18px;"></i>
                        </button>
                        <button class="tray-action-btn-node" onclick="UIController.generateShareTokenLink(${prompt.id})" title="Copy Share Link">
                            <i data-lucide="more-vertical" style="width: 18px; height: 18px;"></i>
                        </button>
                    </div>
                </div>
            `;
            
            gridCanvas.appendChild(cardWrapper);
        });

        lucide.createIcons();
    },

    /* --- THE FULL-SCREEN FOREST ROOT MAP GENERATOR --- */
    renderForestTreeMap() {
        const treeSlot = document.getElementById("forestTreeMapSlot");
        if (!treeSlot) return;
        treeSlot.innerHTML = "";

        const treeData = {};
        
        MemoryStore.categories.forEach(cat => {
            if (cat.name === 'all') return;
            treeData[cat.name] = { color: cat.color, subCategories: {} };
        });

        MemoryStore.prompts.forEach(prompt => {
            if(!treeData[prompt.category]) return;
            
            const subCatKey = prompt.subCategory || prompt.category;
            if(!treeData[prompt.category].subCategories[subCatKey]) {
                treeData[prompt.category].subCategories[subCatKey] = [];
            }
            treeData[prompt.category].subCategories[subCatKey].push(prompt);
        });

        const mainUl = document.createElement("ul");
        mainUl.className = "tree-list";

        Object.keys(treeData).forEach(catName => {
            const catNode = treeData[catName];
            if (Object.keys(catNode.subCategories).length === 0) return;

            const liCategory = document.createElement("li");
            liCategory.className = "tree-node";
            liCategory.innerHTML = `
                <div class="tree-card-label" style="border-left: 8px solid ${catNode.color}">
                    <i data-lucide="folder" style="width:18px; height:18px; color: ${catNode.color}"></i>
                    ${catName} Branch
                </div>
            `;

            const subCatUl = document.createElement("ul");
            subCatUl.className = "tree-list";

            Object.keys(catNode.subCategories).forEach(subName => {
                const promptsArr = catNode.subCategories[subName];
                const liSubCat = document.createElement("li");
                liSubCat.className = "tree-node";
                liSubCat.innerHTML = `
                    <div class="tree-card-label" style="font-size: 14px; padding: 10px 16px;">
                        <i data-lucide="corner-down-right" style="width:16px; height:16px;"></i>
                        ${subName} Node
                    </div>
                `;

                const promptUl = document.createElement("ul");
                promptUl.className = "tree-list";

                promptsArr.forEach(p => {
                    const liPrompt = document.createElement("li");
                    liPrompt.className = "tree-node";
                    const safePayload = btoa(unescape(encodeURIComponent(p.text)));
                    
                    liPrompt.innerHTML = `
                        <div class="tree-prompt-card" onclick="UIController.copyTextToBuffer('${safePayload}')">
                            <div class="tree-card-icon">${p.icon}</div>
                            <span>${p.title}</span>
                            <i data-lucide="copy" style="width:14px; height:14px; margin-left:auto; opacity:0.5;"></i>
                        </div>
                    `;
                    promptUl.appendChild(liPrompt);
                });

                liSubCat.appendChild(promptUl);
                subCatUl.appendChild(liSubCat);
            });

            liCategory.appendChild(subCatUl);
            mainUl.appendChild(liCategory);
        });

        treeSlot.appendChild(mainUl);
        lucide.createIcons();
    },

    /* --- OVERLAY MODAL SYSTEM --- */
    launchTargetModalOverlay(modalId) {
        document.getElementById(modalId).classList.add("open");
    },
    closeOpenModals() {
        document.querySelectorAll(".system-modal-backdrop-overlay").forEach(m => m.classList.remove("open"));
    },

    openPromptWriterModal(targetId = null) {
        const structuralForm = document.getElementById("promptDataAssetForm");
        structuralForm.reset();
        this.repopulateFormDropdownSelect();

        if (targetId) {
            const promptData = MemoryStore.prompts.find(p => p.id === parseInt(targetId));
            if (!promptData) return;

            document.getElementById("promptModalTitle").innerText = "Modify Blueprint";
            document.getElementById("formPromptId").value = promptData.id;
            document.getElementById("formPromptTitle").value = promptData.title;
            document.getElementById("formPromptIcon").value = promptData.icon || "📝";
            document.getElementById("formPromptText").value = promptData.text;
            document.getElementById("formPromptCategorySelect").value = promptData.category;
            document.getElementById("formPromptSubCategory").value = promptData.subCategory;
        } else {
            document.getElementById("promptModalTitle").innerText = "Create Prompt Blueprint";
            document.getElementById("formPromptId").value = "";
            document.getElementById("formPromptIcon").value = "📝";
        }
        this.launchTargetModalOverlay("promptFormModal");
    },

    /* --- SYSTEM ACTIONS & UTILITIES --- */
    toggleCardFavoritedState(id) {
        MemoryStore.togglePromptLikeState(id);
        this.renderMasterPromptGrid();
    },
    executeCardPurge(id) {
        MemoryStore.removePromptRecord(id);
        this.syncMasterDataInterface();
        if(document.getElementById("foldersViewPort").classList.contains("active-viewport")) {
            this.renderForestTreeMap(); 
        }
    },
    repopulateFormDropdownSelect() {
        const selectDropdown = document.getElementById("formPromptCategorySelect");
        if (!selectDropdown) return;
        selectDropdown.innerHTML = "";

        MemoryStore.categories.forEach(cat => {
            if (cat.name === 'all') return;
            const elementNode = document.createElement("option");
            elementNode.value = cat.name;
            elementNode.innerText = cat.name;
            selectDropdown.appendChild(elementNode);
        });
    },
    copyTextToBuffer(base64Payload) {
        const decodedString = decodeURIComponent(escape(atob(base64Payload)));
        navigator.clipboard.writeText(decodedString).then(() => {
            this.dispatchToastAlert("Copied to clipboard buffer.", "success");
        }).catch(() => {
            this.dispatchToastAlert("Clipboard access denied.", "warning");
        });
    },
    generateShareTokenLink(id) {
        const shareURL = `${window.location.origin}/share/vault?promptId=${id}`;
        navigator.clipboard.writeText(shareURL).then(() => {
            this.dispatchToastAlert("Share Link generated and copied.", "success");
        });
    },
    dispatchToastAlert(msg, severity = "info") {
        const notificationHub = document.getElementById("toastNotificationHub");
        if (!notificationHub) return;

        const dynamicBar = document.createElement("div");
        dynamicBar.className = "toast-bar";
        dynamicBar.innerHTML = `<i data-lucide="info" style="width:16px; height:16px; color:var(--premium-purple-accent);"></i> <span>${msg}</span>`;
        
        notificationHub.appendChild(dynamicBar);
        lucide.createIcons();

        setTimeout(() => {
            dynamicBar.style.animation = "toastSpringIn 0.35s reverse ease forwards";
            setTimeout(() => dynamicBar.remove(), 400);
        }, 3000);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    UIController.init();
});
