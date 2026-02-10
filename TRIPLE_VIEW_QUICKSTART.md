# Triple View Layout - Quick Start Guide

## What Was Created

A complete triple-view layout system for the KeyAreas page with:
- **Sidebar** (Left) - Remains fixed with navigation
- **Task List** (Middle-Left) - Shows tasks for selected Key Area, resizable
- **Activity Panel** (Middle-Right) - Shows activities for selected task, resizable
- **Resizable Divider** - Drag to resize the left and right panels

## Files Created

1. **src/components/key-areas/TripleViewLayout.jsx** - Main layout container with drag-to-resize
2. **src/components/key-areas/TaskListPanel.jsx** - Left panel wrapper with header/footer
3. **src/components/key-areas/ActivityListPanel.jsx** - Right panel wrapper with header
4. **src/components/key-areas/KeyAreasTripleView.jsx** - Integrated component combining layout + logic
5. **src/components/key-areas/ResizablePanels.jsx** - Simplified two-panel alternative
6. **src/styles/triple-view.css** - All styling for the triple view layout
7. **TRIPLE_VIEW_GUIDE.md** - Comprehensive technical documentation

## Modified Files

1. **src/pages/KeyAreas.jsx**
   - Added imports for new components and CSS
   - Added new state: `selectedTaskInPanel` to track which task is selected in the left panel
   - Ready to integrate the triple-view components into the render section

## How to Use

### Option 1: Quick Integration with ResizablePanels (Simplest)

Replace the existing tasks display section in KeyAreas.jsx (around line 2965) with:

```jsx
{selectedKA && (
    <ResizablePanels
        taskPanel={
            /* Your existing task list rendering code */
            <div className="p-4">
                <table>
                    {/* Task table/list content */}
                </table>
            </div>
        }
        activityPanel={
            selectedTaskInPanel ? (
                <div className="p-4">
                    <ActivityList
                        task={selectedTaskInPanel}
                        activitiesByTask={activitiesByTask}
                        setActivitiesByTask={setActivitiesByTask}
                        // ... other props
                    />
                </div>
            ) : (
                <div className="flex items-center justify-center h-full text-slate-500">
                    Select a task to view activities
                </div>
            )
        }
        initialTaskWidth={50}
        minTaskWidth={30}
        minActivityWidth={30}
    />
)}
```

### Option 2: Full Integration with KeyAreasTripleView

```jsx
{selectedKA && (
    <KeyAreasTripleView
        selectedKA={selectedKA}
        allTasks={allTasks}
        selectedTaskInPanel={selectedTaskInPanel}
        setSelectedTaskInPanel={setSelectedTaskInPanel}
        taskListContent={
            /* Your existing task list rendering code */
        }
        activityListContent={
            <ActivityList
                task={selectedTaskInPanel}
                activitiesByTask={activitiesByTask}
                setActivitiesByTask={setActivitiesByTask}
                // ... other props
            />
        }
        onAddTask={() => {
            setTaskForm({...});
            setShowTaskComposer(true);
        }}
        tasksLoading={loading}
    />
)}
```

### Option 3: Manual Implementation with TripleViewLayout

```jsx
{selectedKA && (
    <TripleViewLayout
        taskListContent={
            <TaskListPanel
                selectedKA={selectedKA}
                onAddTask={() => setShowTaskComposer(true)}
                tasksLoading={false}
            >
                {/* Task list content */}
            </TaskListPanel>
        }
        activityListContent={
            <ActivityListPanel
                selectedTask={selectedTaskInPanel}
                onTaskDeselect={() => setSelectedTaskInPanel(null)}
            >
                {/* Activity list content */}
            </ActivityListPanel>
        }
        selectedTask={selectedTaskInPanel}
        onTaskSelect={setSelectedTaskInPanel}
        defaultTaskWidth="50%"
    />
)}
```

## Key Features

✅ **Drag-to-Resize** - Smooth divider dragging between panels  
✅ **Responsive Design** - Works on desktop, tablet, and mobile  
✅ **Fixed Sidebar** - Navigation sidebar remains in place  
✅ **Scroll Management** - Each panel scrolls independently  
✅ **Accessibility** - ARIA labels and keyboard support  
✅ **Activity Selection** - Click task in left panel to see activities on right  

## Next Steps

1. Choose one of the three integration options above (ResizablePanels is easiest)
2. Update the task rendering section in `src/pages/KeyAreas.jsx` 
3. Ensure the `selectedTaskInPanel` state is updated when clicking tasks
4. Connect the activity list to show activities for the selected task
5. Test the drag-to-resize functionality with the divider

## Styling Customization

All styles are in `src/styles/triple-view.css`. Customize:
- `--task-panel-bg`: Background color of task panel
- `--activity-panel-bg`: Background color of activity panel
- `--divider-color`: Color of the resizable divider
- Panel widths: Adjust `minTaskWidth` and `minActivityWidth` props
- Scrollbar appearance: Modify webkit-scrollbar styles

## Browser Compatibility

- ✅ Chrome/Edge (Full)
- ✅ Firefox (Full)
- ✅ Safari (Full)
- ⚠️ IE11 (Limited - flexbox partial support)

## Troubleshooting

**Divider not showing?**
- Ensure CSS is imported: Check for `import '../styles/triple-view.css'` in KeyAreas.jsx

**Activities not displaying?**
- Verify `selectedTaskInPanel` is being updated when clicking tasks
- Check `activitiesByTask` has data for selected task ID

**Panel sizing issues?**
- Adjust `initialTaskWidth`, `minTaskWidth`, and `minActivityWidth` props
- Check browser zoom level isn't affecting dimensions

**Layout breaking on resize?**
- Ensure `ResizablePanels` or `TripleViewLayout` container has defined height
- Check parent container allows flex layout

## Support

For technical details, see [TRIPLE_VIEW_GUIDE.md](./TRIPLE_VIEW_GUIDE.md)

For component API details, see individual component files:
- `src/components/key-areas/TripleViewLayout.jsx`
- `src/components/key-areas/ResizablePanels.jsx`
- `src/components/key-areas/KeyAreasTripleView.jsx`
