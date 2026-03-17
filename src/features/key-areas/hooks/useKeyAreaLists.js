import { useCallback, useEffect, useMemo, useState } from 'react';

export default function useKeyAreaLists({
    allTasks,
    getKeyAreaService,
    keyAreas,
    selectedKA,
    setKeyAreas,
    setTaskTab,
    t,
    taskTab,
}) {
    const [listNames, setListNames] = useState({});

    useEffect(() => {
        if (!Array.isArray(keyAreas) || keyAreas.length === 0) return;

        const nextListNames = {};
        keyAreas.forEach((keyArea) => {
            if (keyArea?.id) nextListNames[keyArea.id] = { ...(keyArea.listNames || {}) };
        });
        setListNames(nextListNames);
    }, [keyAreas]);

    const tabNumbers = useMemo(() => {
        const listIndexes = new Set([1]);
        const keyAreaId = selectedKA?.id;

        allTasks
            .filter((task) => !keyAreaId || String(task.key_area_id || task.keyAreaId) === String(keyAreaId))
            .forEach((task) => listIndexes.add(task.list_index || 1));

        return Array.from(listIndexes).sort((a, b) => a - b);
    }, [allTasks, selectedKA]);

    const leftListCount = useMemo(() => {
        const keyAreaId = selectedKA?.id;
        const maxFromTabs = tabNumbers.length ? Math.max(...tabNumbers) : 4;
        const nameKeys = keyAreaId
            ? Object.keys(listNames[String(keyAreaId)] || {})
                .map((key) => Number(key))
                .filter(Boolean)
            : [];
        const maxFromNames = nameKeys.length ? Math.max(...nameKeys) : 0;

        return Math.max(1, maxFromTabs, maxFromNames);
    }, [listNames, selectedKA, tabNumbers]);

    const availableListNumbers = useMemo(() => {
        const listIndexes = new Set(tabNumbers);
        const keyAreaId = selectedKA?.id;

        if (keyAreaId) {
            Object.keys(listNames[String(keyAreaId)] || {})
                .map((key) => Number(key))
                .filter(Boolean)
                .forEach((listNumber) => listIndexes.add(listNumber));
        }

        return Array.from(listIndexes).sort((a, b) => a - b);
    }, [listNames, selectedKA, tabNumbers]);

    const getListName = useCallback((keyAreaId, listNumber) => {
        if (!keyAreaId) return `List ${listNumber}`;

        const names = listNames[String(keyAreaId)] || {};
        return names[String(listNumber)] || `List ${listNumber}`;
    }, [listNames]);

    const renameList = useCallback(async (listNumber) => {
        if (!selectedKA) return;

        const currentName = getListName(selectedKA.id, listNumber);
        const raw = window.prompt(t('keyAreas.promptRenameList'), currentName);
        if (raw === null) return;

        const nextName = String(raw || '').trim();
        if (!nextName) {
            window.alert(t('keyAreas.alertListNameEmpty'));
            return;
        }

        const existingNames = Object.values(listNames[String(selectedKA.id)] || {});
        const hasDuplicate = existingNames.some(
            (name) => String(name || '').toLowerCase() === nextName.toLowerCase() && String(name) !== String(currentName),
        );
        if (hasDuplicate) {
            window.alert(t('keyAreas.alertListNameExists'));
            return;
        }

        const prevMap = { ...(listNames[String(selectedKA.id)] || {}) };
        const nextMap = { ...prevMap, [String(listNumber)]: nextName };

        setListNames((prev) => ({ ...prev, [String(selectedKA.id)]: nextMap }));
        setKeyAreas((prev) =>
            (prev || []).map((keyArea) =>
                String(keyArea.id) === String(selectedKA.id) ? { ...keyArea, listNames: nextMap } : keyArea,
            ),
        );

        try {
            const keyAreaService = await getKeyAreaService();
            await keyAreaService.update(selectedKA.id, { listNames: nextMap });
        } catch (error) {
            console.error('Failed to persist list names', error);
            setListNames((prev) => ({ ...prev, [String(selectedKA.id)]: prevMap }));
            setKeyAreas((prev) =>
                (prev || []).map((keyArea) =>
                    String(keyArea.id) === String(selectedKA.id) ? { ...keyArea, listNames: prevMap } : keyArea,
                ),
            );
            window.alert(t('keyAreas.alertSaveListFailed'));
        }
    }, [getKeyAreaService, getListName, listNames, selectedKA, setKeyAreas, t]);

    const deleteList = useCallback(async (listNumber) => {
        if (!selectedKA) return;

        const keyAreaId = selectedKA.id;
        const hasTasks = (allTasks || []).some(
            (task) => (task.list_index || 1) === listNumber && String(task.key_area_id) === String(keyAreaId),
        );
        if (hasTasks) {
            window.alert(t('keyAreas.alertListHasTasks'));
            return;
        }

        const names = listNames[String(keyAreaId)] || {};
        const hasCustomName = !!names[String(listNumber)];
        const message = hasCustomName
            ? `Delete custom name for list ${listNumber}? Tasks in this list will not be affected.`
            : `Remove list ${listNumber}? It will disappear since it has no tasks.`;

        if (!window.confirm(message)) return;

        const { [String(listNumber)]: _removed, ...rest } = names;
        const prevMap = { ...names };
        const prevTab = taskTab;
        const nextMap = { ...rest };

        setListNames((prev) => ({ ...prev, [String(keyAreaId)]: nextMap }));
        setKeyAreas((prev) =>
            (prev || []).map((keyArea) =>
                String(keyArea.id) === String(keyAreaId) ? { ...keyArea, listNames: nextMap } : keyArea,
            ),
        );

        if (taskTab === listNumber) setTaskTab(1);

        try {
            const keyAreaService = await getKeyAreaService();
            await keyAreaService.update(keyAreaId, { listNames: nextMap });
        } catch (error) {
            console.error('Failed to persist list names', error);
            setListNames((prev) => ({ ...prev, [String(keyAreaId)]: prevMap }));
            setKeyAreas((prev) =>
                (prev || []).map((keyArea) =>
                    String(keyArea.id) === String(keyAreaId) ? { ...keyArea, listNames: prevMap } : keyArea,
                ),
            );
            setTaskTab(prevTab);
            window.alert(t('keyAreas.alertDeleteListFailed'));
        }
    }, [allTasks, getKeyAreaService, listNames, selectedKA, setKeyAreas, setTaskTab, t, taskTab]);

    return {
        availableListNumbers,
        deleteList,
        getListName,
        leftListCount,
        listNames,
        renameList,
        setListNames,
    };
}
