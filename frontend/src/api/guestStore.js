const today = new Date().toISOString().slice(0, 10);
const store = {
    tasks: [
        { id: 'task-1', dateYMD: today, title: '아침 조깅하기', checked: true, note: null, value: null, weight: 1, isOneOff: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), templateId: 'tpl-1', template: { group: 'MORNING' } },
        { id: 'task-2', dateYMD: today, title: '프로젝트 기획서 작성', checked: false, note: '1차 초안 완성', value: null, weight: 2, isOneOff: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), templateId: 'tpl-2', template: { group: 'EXECUTE' } },
        { id: 'task-3', dateYMD: today, title: '저녁에 책 읽기', checked: false, note: null, value: null, weight: 1, isOneOff: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), templateId: 'tpl-3', template: { group: 'EVENING' } },
    ],
    goals: [
        { id: 1, title: '새로운 언어 배우기', description: '스페인어 기초 회화 마스터', startDate: '2024-01-01T00:00:00.000Z', targetDate: '2024-12-31T00:00:00.000Z', progress: 30, isAchieved: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), userId: 'guest' },
    ],
    fixedCosts: [
        { id: 'fc-1', name: '월세', amount: 500000, paymentDate: 25, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'fc-2', name: '인터넷 요금', amount: 50000, paymentDate: 15, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
    templates: [
        { id: 'tpl-1', title: '아침 조깅하기', group: 'MORNING', weight: 1, defaultActive: true, order: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'tpl-2', title: '프로젝트 기획서 작성', group: 'EXECUTE', weight: 2, defaultActive: true, order: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { id: 'tpl-3', title: '저녁에 책 읽기', group: 'EVENING', weight: 1, defaultActive: true, order: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ],
};
const cuid = () => `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
export const guestStoreApi = {
    // ... (existing functions) ...
    getDailyTasks: async (date) => Promise.resolve({ dateYMD: date, tasks: store.tasks.filter(t => t.dateYMD === date) }),
    getGoals: async () => Promise.resolve(store.goals),
    createGoal: async (data) => { const newGoal = { ...data, id: Date.now(), progress: 0, isAchieved: false, userId: 'guest', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; store.goals.push(newGoal); return Promise.resolve(newGoal); },
    getFixedCosts: async () => Promise.resolve(store.fixedCosts),
    addFixedCost: async (data) => { const newFixedCost = { ...data, id: cuid(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; store.fixedCosts.push(newFixedCost); return Promise.resolve(newFixedCost); },
    getTemplates: async () => Promise.resolve(store.templates),
    createTemplate: async (data) => { const newTemplate = { ...data, id: cuid(), weight: 1, defaultActive: true, order: store.templates.filter(t => t.group === data.group).length, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; store.templates.push(newTemplate); return Promise.resolve(newTemplate); },
    updateTemplate: async (id, data) => { const t = store.templates.find(t => t.id === id); if (!t)
        throw new Error('Not found'); Object.assign(t, data); return Promise.resolve(t); },
    deleteTemplate: async (id) => { store.templates = store.templates.filter(t => t.id !== id); return Promise.resolve({}); },
    // New functions for tasks
    addOneoff: async (data) => {
        const newTask = { ...data, id: cuid(), checked: false, note: null, value: null, weight: 1, isOneOff: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), templateId: null };
        store.tasks.push(newTask);
        return Promise.resolve(newTask);
    },
    updateTask: async (id, data) => {
        const task = store.tasks.find(t => t.id === id);
        if (!task)
            throw new Error('Task not found');
        Object.assign(task, data);
        task.updatedAt = new Date().toISOString();
        return Promise.resolve(task);
    },
    // This function handles both creating a task from a template and checking it.
    upsertTaskFromTemplate: async (data) => {
        let task = store.tasks.find(t => t.templateId === data.templateId && t.dateYMD === data.dateYMD);
        if (task) {
            task.checked = data.checked;
            if (data.note)
                task.note = data.note;
            if (data.value)
                task.value = data.value;
            task.updatedAt = new Date().toISOString();
        }
        else {
            const template = store.templates.find(t => t.id === data.templateId);
            if (!template)
                throw new Error('Template not found');
            task = { id: cuid(), dateYMD: data.dateYMD, title: template.title, checked: data.checked, note: data.note ?? null, value: data.value ?? null, weight: template.weight, isOneOff: false, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), templateId: template.id, template: { group: template.group } };
            store.tasks.push(task);
        }
        return Promise.resolve(task);
    },
    deleteTask: async (id) => {
        store.tasks = store.tasks.filter(t => t.id !== id);
        return Promise.resolve({});
    },
};
