import { useEffect, useRef, useState } from 'react';

function useDismissOnClickOutsideAndEscape({ isOpen, refs, onClose }) {
    useEffect(() => {
        if (!isOpen) return undefined;

        const handleClick = (event) => {
            const clickedInside = refs.some((ref) => ref.current && ref.current.contains(event.target));
            if (!clickedInside) onClose();
        };

        const handleKey = (event) => {
            if (event.key === 'Escape') onClose();
        };

        document.addEventListener('mousedown', handleClick);
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('keydown', handleKey);
        };
    }, [isOpen, onClose, refs]);
}

export default function useKeyAreasMenus() {
    const [panelViewMode, setPanelViewMode] = useState(() => {
        try {
            return window.localStorage.getItem('keyareas.panelViewMode') || 'triple';
        } catch {
            return 'triple';
        }
    });
    const [showPanelViewMenu, setShowPanelViewMenu] = useState(false);
    const panelViewMenuRef = useRef(null);
    const [openActivitiesMenu, setOpenActivitiesMenu] = useState(null);
    const [activitiesMenuPos, setActivitiesMenuPos] = useState({ top: 0, left: 0 });
    const [showColumnsMenu, setShowColumnsMenu] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const columnsMenuRef = useRef(null);
    const statusMenuRef = useRef(null);
    const [openListMenu, setOpenListMenu] = useState(null);
    const [listMenuPos, setListMenuPos] = useState({ top: 0, left: 0 });
    const tabsRef = useRef(null);

    useEffect(() => {
        try {
            window.localStorage.setItem('keyareas.panelViewMode', panelViewMode);
        } catch {}
    }, [panelViewMode]);

    useDismissOnClickOutsideAndEscape({
        isOpen: showPanelViewMenu,
        refs: [panelViewMenuRef],
        onClose: () => setShowPanelViewMenu(false),
    });

    useDismissOnClickOutsideAndEscape({
        isOpen: showColumnsMenu,
        refs: [columnsMenuRef],
        onClose: () => setShowColumnsMenu(false),
    });

    useDismissOnClickOutsideAndEscape({
        isOpen: showStatusMenu,
        refs: [statusMenuRef],
        onClose: () => setShowStatusMenu(false),
    });

    useDismissOnClickOutsideAndEscape({
        isOpen: openListMenu != null,
        refs: [tabsRef],
        onClose: () => setOpenListMenu(null),
    });

    useEffect(() => {
        if (!openActivitiesMenu) return undefined;

        const handleKey = (event) => {
            if (event.key === 'Escape') setOpenActivitiesMenu(null);
        };

        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [openActivitiesMenu]);

    return {
        activitiesMenuPos,
        columnsMenuRef,
        listMenuPos,
        openActivitiesMenu,
        openListMenu,
        panelViewMenuRef,
        panelViewMode,
        setActivitiesMenuPos,
        setOpenActivitiesMenu,
        setOpenListMenu,
        setListMenuPos,
        setPanelViewMode,
        setShowColumnsMenu,
        setShowPanelViewMenu,
        setShowStatusMenu,
        showColumnsMenu,
        showPanelViewMenu,
        showStatusMenu,
        statusMenuRef,
        tabsRef,
    };
}
