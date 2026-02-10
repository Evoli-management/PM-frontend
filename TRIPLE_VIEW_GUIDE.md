# Triple View Layout Implementation Guide

## Overview

The Triple View Layout divides the UI into three main areas:

1. **Sidebar Menu** (Left, Fixed) - Navigation and key areas selector
2. **Task List Panel** (Middle-Left, Resizable) - Displays tasks for selected Key Area
3. **Activity Panel** (Middle-Right, Resizable) - Shows activities for the selected task

## Components Created

### 1. TripleViewLayout.jsx
Main layout wrapper that creates a three-panel structure with:
- Resizable divider between task and activity panels
- Collapse/expand functionality for the activity panel
- Responsive design for mobile and tablet views

**Location:** `src/components/key-areas/TripleViewLayout.jsx`

**Props:**
- `taskListContent` (React.ReactNode) - Content for the left task panel
- `activityListContent` (React.ReactNode) - Content for the right activity panel
- `selectedTask` (Object|null) - Currently selected task
- `onTaskSelect` (Function) - Callback when task is selected
- `taskPanelMinWidth` (Number) - Minimum width for task panel in pixels
- `activityPanelMinWidth` (Number) - Minimum width for activity panel in pixels
- `defaultTaskWidth` (String) - Default width percentage for task panel

### 2. TaskListPanel.jsx
Wrapper component for the left task panel providing:
- Header with Key Area title and task count
- Scrollable task list content area
- Footer with "Add Task" button

**Location:** `src/components/key-areas/TaskListPanel.jsx`

**Props:**
- `children` (React.ReactNode) - Task list content
- `selectedKA` (Object) - Currently selected Key Area
- `onAddTask` (Function) - Callback for Add Task button
- `tasksLoading` (Boolean) - Loading state
- `header` (React.ReactNode) - Custom header content

### 3. ActivityListPanel.jsx
Wrapper component for the right activity panel providing:
- Header with selected task title
- Scrollable activity list content area
- Close button to deselect task

**Location:** `src/components/key-areas/ActivityListPanel.jsx`

**Props:**
- `children` (React.ReactNode) - Activity list content
- `selectedTask` (Object) - Currently selected task
- `onTaskDeselect` (Function) - Callback to deselect task
- `header` (React.ReactNode) - Custom header content

### 4. ResizablePanels.jsx
Simpler alternative implementation using CSS for two-panel layout with:
- Smooth drag-to-resize divider
- Configurable minimum widths
- Flexible percentage-based sizing

**Location:** `src/components/key-areas/ResizablePanels.jsx`

**Props:**
- `taskPanel` (React.ReactNode) - Left panel content
- `activityPanel` (React.ReactNode) - Right panel content
- `initialTaskWidth` (Number) - Initial task panel width percentage (default: 50)
- `minTaskWidth` (Number) - Minimum task panel width percentage
- `minActivityWidth` (Number) - Minimum activity panel width percentage

### 5. KeyAreasTripleView.jsx
Integrated component that combines layout with Key Areas logic:
- Manages task and activity panel selection
- Handles task count and activity loading
- Provides headers and footers

**Location:** `src/components/key-areas/KeyAreasTripleView.jsx`

## Styling

### CSS File: triple-view.css
Contains all styling for the triple view layout:
- Container flex layout
- Panel styling with proper scrolling
- Divider styling with hover effects
- Responsive breakpoints for mobile/tablet
- Scrollbar customization
- Empty state styling

**Location:** `src/styles/triple-view.css`

## Integration with KeyAreas Page

The triple-view components are imported in `src/pages/KeyAreas.jsx`:

```jsx
import TripleViewLayout from '../components/key-areas/TripleViewLayout';
import TaskListPanel from '../components/key-areas/TaskListPanel';
import ActivityListPanel from '../components/key-areas/ActivityListPanel';
import ResizablePanels from '../components/key-areas/ResizablePanels';
import KeyAreasTripleView from '../components/key-areas/KeyAreasTripleView';
import '../styles/triple-view.css';
```

A new state is added to track the selected task in the left panel:
```jsx
const [selectedTaskInPanel, setSelectedTaskInPanel] = useState(null);
```

## Usage Examples

### Basic Usage with TripleViewLayout
```jsx
<TripleViewLayout
    taskListContent={<div>{/* Task list rendering */}</div>}
    activityListContent={<div>{/* Activity list rendering */}</div>}
    selectedTask={selectedTaskInPanel}
    onTaskSelect={setSelectedTaskInPanel}
    defaultTaskWidth="50%"
/>
```

### Using ResizablePanels (Simpler)
```jsx
<ResizablePanels
    taskPanel={<div>{/* Task list */}</div>}
    activityPanel={<div>{/* Activity list */}</div>}
    initialTaskWidth={50}
    minTaskWidth={30}
    minActivityWidth={30}
/>
```

### Using KeyAreasTripleView (Integrated)
```jsx
<KeyAreasTripleView
    selectedKA={selectedKA}
    allTasks={allTasks}
    selectedTaskInPanel={selectedTaskInPanel}
    setSelectedTaskInPanel={setSelectedTaskInPanel}
    taskListContent={/* Task list JSX */}
    activityListContent={/* Activity list JSX */}
    onAddTask={() => setShowTaskComposer(true)}
    tasksLoading={loading}
/>
```

## Features

### Resizable Divider
- Drag the divider between panels to resize
- Enforces minimum widths for both panels
- Smooth cursor feedback (hover changes color)
- Smooth transitions when not dragging

### Responsive Design
- Desktop: Side-by-side layout (horizontal split)
- Tablet: Adjustable widths with touch-friendly divider
- Mobile: Stacked layout (vertical split)

### Activity Panel Controls
- Close button to deselect task
- Empty state message when no task is selected
- Task title and activity count in header

### Accessibility
- ARIA labels on interactive elements
- Proper semantic HTML
- Keyboard navigation support via divider

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- IE11: Limited support (flexbox partial)

## Performance Considerations

1. **Virtualization**: For large task lists (100+ items), consider implementing virtual scrolling
2. **Memoization**: Wrap task and activity list components with React.memo() to prevent unnecessary re-renders
3. **Lazy Loading**: Load activities only when task is selected
4. **Resize Debouncing**: Divider drag events are throttled to prevent excessive re-renders

## Future Enhancements

1. **Preset Layouts**: Save user's preferred panel width ratio
2. **Collapsible Panels**: Hide/show panels with keyboard shortcuts
3. **Mobile Optimization**: Swipe to switch between panels on mobile
4. **Dark Mode**: Support for dark theme styling
5. **Keyboard Navigation**: Arrow keys to navigate tasks and activities
6. **Drag & Drop**: Drag tasks between lists or reorder within panels

## Troubleshooting

### Divider Not Resizing
- Ensure `isDragging` state is being managed properly
- Check that `onMouseMove` and `onMouseUp` event listeners are attached to document
- Verify `containerRef` is properly connected to the container div

### Activities Not Showing
- Check that `selectedTaskInPanel` state is being updated when task is clicked
- Verify `activitiesByTask` data structure contains activities for selected task
- Ensure ActivityList component is receiving correct `task` prop

### Layout Breaking on Mobile
- Check CSS media queries in triple-view.css
- Verify responsive breakpoints are appropriate for target devices
- Test with browser DevTools device emulation

## Related Files

- Main component: `src/pages/KeyAreas.jsx`
- Task list component: `src/components/key-areas/TaskRow.jsx`
- Activity list component: `src/components/key-areas/ActivityList.jsx`
- Services: `src/services/taskService.js`, `src/services/activityService.js`
