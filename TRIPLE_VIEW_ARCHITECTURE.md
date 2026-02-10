# Triple View Layout - Visual Architecture

## Desktop Layout (1200px+)

```
┌─────────────────────────────────────────────────────────────────────┐
│                           NAVBAR / HEADER                            │
├────────┬──────────────────────────────────────────────────────────────┤
│        │                                                              │
│        │  MAIN CONTENT AREA                                          │
│ SIDEBAR│  ┌──────────────────────────────────────────────────────┐  │
│        │  │                                                      │  │
│        │  │  SELECTED KEY AREA NAME & CONTROLS                   │  │
│        │  │                                                      │  │
│        │  ├──────────────────────┬──────────────────────────────┤  │
│        │  │                      │                              │  │
│        │  │                      │                              │  │
│        │  │   TASK LIST          │   ACTIVITY PANEL             │  │
│        │  │   (LEFT PANEL)       ║   (RIGHT PANEL)              │  │
│        │  │                      │                              │  │
│        │  │ • Task 1            │ ╔═ Task 1 Activities ═════╗ │  │
│        │  │   (selected)        ║ ║ • Activity A            ║ │  │
│        │  │                      ║ ║ • Activity B            ║ │  │
│        │  │ • Task 2             ║ ║ • Activity C            ║ │  │
│        │  │                      ║ ║ • [Add new activity]    ║ │  │
│        │  │ • Task 3             ║ ╚═════════════════════════╝ │  │
│        │  │                      │                              │  │
│        │  │ • Task N             │  (Select a task to view its  │  │
│        │  │                      │   activities)                │  │
│        │  │                      │                              │  │
│        │  │ [Add Task]           │                              │  │
│        │  │                      │                              │  │
│        │  └──────────────────────┴──────────────────────────────┘  │
│        │         ▲                                                   │
│        │         │ Resizable Divider                                │
│        │         │ Drag ↔ to resize panels                          │
│        │                                                             │
└────────┴──────────────────────────────────────────────────────────────┘
```

## Tablet Layout (768px - 1199px)

```
┌──────────────────────────────────────────────────────────┐
│           NAVBAR (with hamburger menu)                    │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ SELECTED KEY AREA & CONTROLS                            │
│                                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ TASK LIST (60% width, resizable)                        │
│ ┌────────────────────────────┐                          │
│ │ • Task 1 (selected)        │                          │
│ │ • Task 2                   │║ ACTIVITY PANEL (40%)    │
│ │ • Task 3                   │║ ┌──────────────────┐   │
│ │ [Add Task]                 │║ │ Task 1 Activities│   │
│ └────────────────────────────┘║ │ • Activity A     │   │
│                                ║ │ • Activity B     │   │
│                                ║ └──────────────────┘   │
│                                                          │
│                        ▲                                 │
│                        │ Resizable Divider               │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## Mobile Layout (< 768px)

```
┌──────────────────────────────┐
│   NAVBAR (Hamburger Menu)    │
├──────────────────────────────┤
│                              │
│  TASK LIST (Full Width)      │
│  ┌────────────────────────┐  │
│  │ Tasks for Key Area     │  │
│  │ • Task 1 (selected)    │  │
│  │ • Task 2               │  │
│  │ • Task 3               │  │
│  │ • Task N               │  │
│  │ [Add Task]             │  │
│  └────────────────────────┘  │
│           ▲                   │
│           │ (Drag to show     │
│           │  activities)      │
│                              │
│  ACTIVITY PANEL              │
│  ┌────────────────────────┐  │
│  │ Task 1 Activities      │  │
│  │ • Activity A           │  │
│  │ • Activity B           │  │
│  │ • [Add activity]       │  │
│  │ [X] Close              │  │
│  └────────────────────────┘  │
│                              │
└──────────────────────────────┘
```

## Component Hierarchy

```
KeyAreas Page
│
├─ Sidebar (Fixed Left)
│
└─ Main Content Area
   │
   ├─ Header
   │  ├─ Key Area Title
   │  ├─ Search / Filters
   │  └─ Settings
   │
   └─ TripleViewLayout (or ResizablePanels)
      │
      ├─ LEFT PANEL (Task List)
      │  │
      │  └─ TaskListPanel
      │     ├─ Header (Key Area name, task count)
      │     ├─ Content
      │     │  ├─ Search
      │     │  ├─ Filters
      │     │  └─ Task Table/List
      │     │     ├─ TaskRow 1 (clickable)
      │     │     ├─ TaskRow 2
      │     │     └─ TaskRow N
      │     └─ Footer ([Add Task] button)
      │
      ├─ DIVIDER (Resizable ↔)
      │
      └─ RIGHT PANEL (Activities)
         │
         └─ ActivityListPanel
            ├─ Header (Task name, close button)
            ├─ Content
            │  ├─ ActivityRow 1
            │  ├─ ActivityRow 2
            │  └─ ActivityRow N
            └─ [Add Activity] button
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    COMPONENT STATES                         │
└─────────────────────────────────────────────────────────────┘

1. SELECT KEY AREA
   ↓
   setSelectedKA(keyArea)
   └─→ Load keyArea tasks
       └─→ setAllTasks(tasks)

2. TASK RENDERING
   ↓
   Display allTasks in left panel
   └─→ Each task is clickable

3. SELECT TASK (Click task in left panel)
   ↓
   setSelectedTaskInPanel(task)
   └─→ Load activities for task
       └─→ Load from activitiesByTask[taskId]

4. ACTIVITY RENDERING
   ↓
   Display activities in right panel
   └─→ Based on selectedTaskInPanel

5. CLOSE/DESELECT
   ↓
   setSelectedTaskInPanel(null)
   └─→ Right panel shows empty state
       └─→ Message: "Select a task"

6. RESIZE PANELS
   ↓
   Drag divider left/right
   └─→ Update taskPanelWidth state
       └─→ CSS recalculates layout
```

## Interaction Flow

```
USER INTERACTION          STATE CHANGE              COMPONENT UPDATE
─────────────────────     ──────────────────        ──────────────────

1. Click Key Area    →    setSelectedKA(ka)    →   Load & show tasks
                                                     in left panel

2. Click Task        →    setSelectedTaskInPanel   Show activities
                          (task)                    in right panel

3. Click Activity    →    [Custom handler]     →   Update activity
                                                     in activity list

4. Drag Divider      →    setTaskPanelWidth   →   Resize both panels
                          (newWidth)               with smooth
                                                     animation

5. Click Add Task    →    setShowTaskComposer →   Open modal
                          (true)                   to create task

6. Click Add         →    setShowActivityForm →   Open modal
   Activity              (true)                   to create activity

7. Close Panel       →    setSelectedTaskInPanel   Hide activities,
   (X button)            (null)                    show empty state
```

## Event Listeners & Handlers

```
┌──────────────────────────────────────────────────────────────┐
│                    EVENT HANDLING                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ DIVIDER:                                                     │
│ • onMouseDown → setIsDragging(true)                         │
│ • onMouseMove (document) → Calculate new width              │
│ • onMouseUp (document) → setIsDragging(false)               │
│                                                              │
│ TASK ROW:                                                    │
│ • onClick → setSelectedTaskInPanel(task)                    │
│           → Load activities for task                        │
│                                                              │
│ ACTIVITY ROW:                                                │
│ • onClick → Custom handler (edit/view)                      │
│                                                              │
│ ADD BUTTONS:                                                 │
│ • [Add Task] → setShowTaskComposer(true)                    │
│ • [Add Activity] → setShowActivityForm(true)                │
│                                                              │
│ CLOSE BUTTONS:                                               │
│ • [X] → setSelectedTaskInPanel(null)                        │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Panel Width Configuration

```
DESKTOP LAYOUT (Default)
├─ Initial: 50% / 50%
├─ Min Task Width: 30%
├─ Min Activity Width: 30%
└─ Max Task Width: 70%

TABLET LAYOUT
├─ Initial: 60% / 40%
├─ Min Task Width: 40%
├─ Min Activity Width: 30%
└─ Max Task Width: 70%

MOBILE LAYOUT (Stacked)
├─ Task Panel: 100% height (scrollable)
├─ Activity Panel: 100% height (overlay/below)
└─ Divider: Horizontal (swipe or scroll to switch)

CUSTOM CONFIGURATION
├─ Pass initialTaskWidth="40%" for 40%/60% split
├─ Pass minTaskWidth={35} for minimum 35% width
└─ Pass minActivityWidth={35} for minimum 35% width
```

## CSS Classes Applied

```
CONTAINER
└─ .triple-view-container
   │
   ├─ .triple-view-panel (Left - Task Panel)
   │  ├─ .task-list-panel
   │  ├─ .task-list-panel-header
   │  ├─ .task-list-panel-content
   │  └─ .task-list-panel-footer
   │
   ├─ .triple-view-divider (Resizable separator)
   │  └─ .triple-view-divider.dragging (when dragging)
   │
   └─ .triple-view-panel (Right - Activity Panel)
      ├─ .activity-panel
      ├─ .activity-panel-header
      └─ .activity-panel-content
```

## Performance Considerations

```
RENDERING OPTIMIZATIONS
├─ useMemo for filtered/sorted tasks
├─ React.memo for TaskRow components
├─ Lazy load activities (only when task selected)
├─ Virtual scrolling for 100+ tasks
└─ Throttle divider drag events

MEMORY MANAGEMENT
├─ Clean up event listeners
├─ Cancel async operations on unmount
├─ Batch state updates
└─ Avoid nested object mutations

BUNDLE SIZE
├─ No external layout libraries
├─ Uses only React hooks
├─ Minified CSS < 5KB
└─ Total component size < 15KB
```

This visual architecture shows how the triple-view layout organizes the Key Areas interface for better task and activity management.
