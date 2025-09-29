// Minimal local storage backed Elephant Task service
const STORAGE_KEY = "elephantTasks";

function read() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function write(list) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    } catch {}
}

const elephantTaskService = {
    async getElephantTasks() {
        return read();
    },
    async createElephantTask({ title, taskId = null }) {
        const list = read();
        const item = { id: crypto.randomUUID(), title, taskId, createdAt: new Date().toISOString() };
        list.push(item);
        write(list);
        return item;
    },
    async removeElephantTask(id) {
        const list = read().filter((x) => String(x.id) !== String(id));
        write(list);
        return { success: true };
    },
};

export default elephantTaskService;
