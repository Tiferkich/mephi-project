/**
 * Widget Service
 * Управление конфигурацией виджетов (хранение в localStorage)
 */

const WIDGETS_STORAGE_KEY = 'widgets_config';

/**
 * Генерация уникального ID
 */
const generateId = () => {
    return `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Получение конфигурации виджетов
 * @returns {Array} - Массив виджетов
 */
export const getWidgets = () => {
    try {
        const stored = localStorage.getItem(WIDGETS_STORAGE_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error('Error loading widgets:', error);
    }
    
    // Возвращаем дефолтные виджеты если ничего нет
    return getDefaultWidgets();
};

/**
 * Сохранение конфигурации виджетов
 * @param {Array} widgets - Массив виджетов
 */
export const saveWidgets = (widgets) => {
    try {
        localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(widgets));
    } catch (error) {
        console.error('Error saving widgets:', error);
    }
};

/**
 * Создание нового виджета
 * @param {string} type - Тип виджета (passwords, notes, files)
 * @param {string} title - Название виджета
 * @returns {Object} - Новый виджет
 */
export const createWidget = (type, title) => {
    const widgets = getWidgets();
    
    const newWidget = {
        id: generateId(),
        type,
        title,
        collapsed: false,
        width: type === 'files' ? 450 : 400,
        height: type === 'files' ? 400 : 350,
        createdAt: new Date().toISOString(),
        order: widgets.length
    };
    
    widgets.push(newWidget);
    saveWidgets(widgets);
    
    return newWidget;
};

/**
 * Обновление размера виджета
 * @param {string} widgetId - ID виджета
 * @param {number} width - Новая ширина
 * @param {number} height - Новая высота
 */
export const updateWidgetSize = (widgetId, width, height) => {
    const widgets = getWidgets();
    const widget = widgets.find(w => w.id === widgetId);
    
    if (widget) {
        widget.width = width;
        widget.height = height;
        saveWidgets(widgets);
    }
};

/**
 * Обновление виджета
 * @param {string} widgetId - ID виджета
 * @param {Object} updates - Обновления
 * @returns {Object|null} - Обновленный виджет
 */
export const updateWidget = (widgetId, updates) => {
    const widgets = getWidgets();
    const index = widgets.findIndex(w => w.id === widgetId);
    
    if (index !== -1) {
        widgets[index] = { ...widgets[index], ...updates };
        saveWidgets(widgets);
        return widgets[index];
    }
    
    return null;
};

/**
 * Удаление виджета
 * @param {string} widgetId - ID виджета
 */
export const deleteWidget = (widgetId) => {
    const widgets = getWidgets();
    const filtered = widgets.filter(w => w.id !== widgetId);
    saveWidgets(filtered);
};

/**
 * Обновление порядка виджетов
 * @param {Array} orderedWidgets - Массив виджетов в новом порядке
 */
export const reorderWidgets = (orderedWidgets) => {
    const updated = orderedWidgets.map((widget, index) => ({
        ...widget,
        order: index
    }));
    saveWidgets(updated);
};

/**
 * Переключение состояния свернутости виджета
 * @param {string} widgetId - ID виджета
 */
export const toggleWidgetCollapse = (widgetId) => {
    const widgets = getWidgets();
    const widget = widgets.find(w => w.id === widgetId);
    
    if (widget) {
        widget.collapsed = !widget.collapsed;
        saveWidgets(widgets);
        return widget.collapsed;
    }
    
    return false;
};

/**
 * Получение дефолтных виджетов (при первом запуске)
 * @returns {Array}
 */
const getDefaultWidgets = () => {
    const defaults = [
        {
            id: generateId(),
            type: 'passwords',
            title: 'My Passwords',
            collapsed: false,
            width: 400,
            height: 350,
            createdAt: new Date().toISOString(),
            order: 0
        },
        {
            id: generateId(),
            type: 'notes',
            title: 'My Notes',
            collapsed: false,
            width: 400,
            height: 350,
            createdAt: new Date().toISOString(),
            order: 1
        },
        {
            id: generateId(),
            type: 'files',
            title: 'My Files',
            collapsed: false,
            width: 450,
            height: 400,
            createdAt: new Date().toISOString(),
            order: 2
        }
    ];
    
    saveWidgets(defaults);
    return defaults;
};

/**
 * Сброс виджетов к дефолтным
 */
export const resetWidgets = () => {
    localStorage.removeItem(WIDGETS_STORAGE_KEY);
    return getDefaultWidgets();
};

export default {
    getWidgets,
    saveWidgets,
    createWidget,
    updateWidget,
    deleteWidget,
    reorderWidgets,
    toggleWidgetCollapse,
    updateWidgetSize,
    resetWidgets
};

