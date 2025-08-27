const DB_NAME = 'MomoholicsDB';
const DB_VERSION = 1;
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => reject("IndexedDB error: " + request.error);
        
        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains('profile')) {
                db.createObjectStore('profile', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('cart')) {
                db.createObjectStore('cart', { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };
    });
}

// --- Profile Functions ---
async function saveProfile(profileData) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('profile', 'readwrite');
        const store = transaction.objectStore('profile');
        const request = store.put({ id: 'userProfile', ...profileData });
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getProfile() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('profile', 'readonly');
        const store = transaction.objectStore('profile');
        const request = store.get('userProfile');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// --- Cart Functions ---
async function getCart() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('cart', 'readonly');
        const store = transaction.objectStore('cart');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function addItemToCart(item) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('cart', 'readwrite');
        const store = transaction.objectStore('cart');
        const request = store.add(item);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function updateCartItem(id, newQuantity) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('cart', 'readwrite');
        const store = transaction.objectStore('cart');
        const getRequest = store.get(id);
        getRequest.onsuccess = () => {
            const item = getRequest.result;
            if (item) {
                item.quantity = newQuantity;
                const putRequest = store.put(item);
                putRequest.onsuccess = () => resolve(putRequest.result);
                putRequest.onerror = () => reject(putRequest.error);
            } else {
                reject("Item not found");
            }
        };
        getRequest.onerror = () => reject(getRequest.error);
    });
}

async function deleteCartItem(id) {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('cart', 'readwrite');
        const store = transaction.objectStore('cart');
        const request = store.delete(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


async function clearCart() {
    if (!db) await initDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('cart', 'readwrite');
        const store = transaction.objectStore('cart');
        const request = store.clear();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}