"use client"

import { useState, useCallback, useMemo, useEffect, useRef } from "react"
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  NodeTypes,
  Handle,
  Position,
} from "@xyflow/react"
import "@xyflow/react/dist/style.css"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Play,
  Plus,
  Trash2,
  Mail,
  Tag,
  Package,
  Bell,
  Webhook,
  CheckCircle2,
  X,
  Settings,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface AutomationFlowBuilderProps {
  trigger: { type: string; filters?: any } | null
  onTriggerChange: (trigger: { type: string; filters?: any } | null) => void
  conditions: any[]
  onConditionsChange: (conditions: any[]) => void
  actions: any[]
  onActionsChange: (actions: any[]) => void
  eventTypes: { value: string; label: string }[]
}

// Custom Node Components
const TriggerNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 bg-purple-50 border-2 border-purple-300 rounded-lg shadow-sm min-w-[200px] cursor-move">
      <div className="flex items-center gap-2 mb-2">
        <Play className="w-5 h-5 text-purple-600" />
        <div className="font-semibold text-purple-900">התחל כאשר...</div>
      </div>
      <div className="text-sm text-purple-700 bg-white p-2 rounded border border-purple-200">
        {data.label || "בחר אירוע"}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-purple-500 !w-3 !h-3" />
    </div>
  )
}

const ConditionNode = ({ data }: { data: any }) => {
  return (
    <div className="px-4 py-3 bg-blue-50 border-2 border-blue-300 rounded-lg shadow-sm min-w-[200px] cursor-move">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 className="w-5 h-5 text-blue-600" />
        <div className="font-semibold text-blue-900">בדוק אם...</div>
      </div>
      <div className="text-sm text-blue-700 bg-white p-2 rounded border border-blue-200">
        {data.label || "תנאי"}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-blue-500 !w-3 !h-3" />
      <div className="flex gap-2 mt-2 relative">
        <Handle type="source" position={Position.Bottom} id="then" className="!bg-green-500 !w-3 !h-3 !right-4" />
        <Handle type="source" position={Position.Bottom} id="otherwise" className="!bg-red-500 !w-3 !h-3 !left-4" />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-green-600">אז</span>
        <span className="text-red-600">אחרת</span>
      </div>
      <div className="text-xs text-gray-500 mt-2 text-center">לחיצה כפולה לעריכה</div>
    </div>
  )
}

const ActionNode = ({ data }: { data: any }) => {
  const Icon = data.icon || Package
  return (
    <div className="px-4 py-3 bg-green-50 border-2 border-green-300 rounded-lg shadow-sm min-w-[200px] cursor-move">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-5 h-5 text-green-600" />
        <div className="font-semibold text-green-900">בצע פעולה...</div>
      </div>
      <div className="text-sm text-green-700 bg-white p-2 rounded border border-green-200">
        {data.label || "פעולה"}
      </div>
      <Handle type="target" position={Position.Top} className="!bg-green-500 !w-3 !h-3" />
      <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-3 !h-3" />
      <div className="text-xs text-gray-500 mt-2 text-center">לחיצה כפולה לעריכה</div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
}

export default function AutomationFlowBuilder({
  trigger,
  onTriggerChange,
  conditions,
  onConditionsChange,
  actions,
  onActionsChange,
  eventTypes,
}: AutomationFlowBuilderProps) {
  const [conditionDialogOpen, setConditionDialogOpen] = useState(false)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null)

  // Condition form state
  const [conditionField, setConditionField] = useState("")
  const [conditionOperator, setConditionOperator] = useState("equals")
  const [conditionValue, setConditionValue] = useState("")
  const [conditionLogicalOp, setConditionLogicalOp] = useState<"AND" | "OR">("AND")

  // Action form state
  const [actionType, setActionType] = useState("send_email")
  const [actionConfig, setActionConfig] = useState<any>({})

  const actionTypes = [
    {
      value: "send_email",
      label: "שלח אימייל",
      icon: Mail,
      description: "שלח אימייל ללקוח או למשתמש",
    },
    {
      value: "add_customer_tag",
      label: "הוסף תג ללקוח",
      icon: Tag,
      description: "הוסף תג ללקוח",
    },
    {
      value: "update_order_status",
      label: "עדכן סטטוס הזמנה",
      icon: Package,
      description: "עדכן את סטטוס ההזמנה",
    },
    {
      value: "create_notification",
      label: "צור התראה",
      icon: Bell,
      description: "צור התראה במערכת",
    },
    {
      value: "webhook",
      label: "שלח Webhook",
      icon: Webhook,
      description: "שלח Webhook ל-URL חיצוני",
    },
  ]

  const operators = [
    { value: "equals", label: "שווה ל" },
    { value: "not_equals", label: "לא שווה ל" },
    { value: "greater_than", label: "גדול מ" },
    { value: "less_than", label: "קטן מ" },
    { value: "contains", label: "מכיל" },
    { value: "not_contains", label: "לא מכיל" },
    { value: "in", label: "נמצא ב" },
    { value: "not_in", label: "לא נמצא ב" },
  ]

  // Create nodes and edges with useMemo
  const initialNodes: Node[] = useMemo(() => {
    const nodes: Node[] = []
    let yPos = 100

    // Trigger node
    if (trigger) {
      const eventLabel = eventTypes.find((e) => e.value === trigger.type)?.label || trigger.type
      nodes.push({
        id: "trigger",
        type: "trigger",
        position: { x: 400, y: yPos },
        data: {
          label: eventLabel,
          type: trigger.type,
        },
      })
      yPos += 150
    }

    // Condition nodes
    conditions.forEach((condition, index) => {
      const conditionLabel = `${condition.field} ${operators.find((op) => op.value === condition.operator)?.label || condition.operator} ${condition.value}`
      nodes.push({
        id: `condition-${index}`,
        type: "condition",
        position: { x: 400, y: yPos },
        data: {
          label: conditionLabel,
          condition,
          index,
        },
      })
      yPos += 150
    })

    // Action nodes
    actions.forEach((action, index) => {
      const actionTypeInfo = actionTypes.find((at) => at.value === action.type)
      nodes.push({
        id: `action-${index}`,
        type: "action",
        position: { x: 400, y: yPos },
        data: {
          label: actionTypeInfo?.label || action.type,
          icon: actionTypeInfo?.icon || Package,
          action,
          index,
        },
      })
      yPos += 150
    })

    return nodes
  }, [trigger, conditions, actions, eventTypes, actionTypes, operators])

  const initialEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []

    // Connect trigger to first condition or first action
    if (trigger) {
      if (conditions.length > 0) {
        edges.push({
          id: "trigger-condition-0",
          source: "trigger",
          target: "condition-0",
          type: "smoothstep",
          animated: true,
        })
      } else if (actions.length > 0) {
        edges.push({
          id: "trigger-action-0",
          source: "trigger",
          target: "action-0",
          type: "smoothstep",
          animated: true,
        })
      }
    }

    // Connect conditions
    conditions.forEach((_, index) => {
      if (index > 0) {
        edges.push({
          id: `condition-${index - 1}-condition-${index}`,
          source: `condition-${index - 1}`,
          target: `condition-${index}`,
          sourceHandle: "then",
          type: "smoothstep",
          animated: true,
        })
      }
    })

    // Connect conditions to actions
    if (conditions.length > 0 && actions.length > 0) {
      edges.push({
        id: `condition-${conditions.length - 1}-action-0`,
        source: `condition-${conditions.length - 1}`,
        target: "action-0",
        sourceHandle: "then",
        type: "smoothstep",
        animated: true,
      })
    }

    // Connect actions
    actions.forEach((_, index) => {
      if (index > 0) {
        edges.push({
          id: `action-${index - 1}-action-${index}`,
          source: `action-${index - 1}`,
          target: `action-${index}`,
          type: "smoothstep",
          animated: true,
        })
      }
    })

    return edges
  }, [trigger, conditions, actions])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  const prevNodesRef = useRef<string>("")
  const prevEdgesRef = useRef<string>("")

  // Update nodes and edges when data changes
  useEffect(() => {
    const nodesKey = initialNodes.map(n => n.id).join(',')
    const edgesKey = initialEdges.map(e => e.id).join(',')
    
    if (nodesKey !== prevNodesRef.current) {
      setNodes(initialNodes)
      prevNodesRef.current = nodesKey
    }
    
    if (edgesKey !== prevEdgesRef.current) {
      setEdges(initialEdges)
      prevEdgesRef.current = edgesKey
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges])

  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge(params, eds))
    },
    [setEdges]
  )

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    // Double click to edit
    if ((event as any).detail === 2) {
      if (node.type === "condition") {
        const condition = node.data.condition
        setConditionField(condition.field)
        setConditionOperator(condition.operator)
        setConditionValue(condition.value)
        setConditionLogicalOp(condition.logicalOperator || "AND")
        setEditingNodeId(node.id)
        setConditionDialogOpen(true)
      } else if (node.type === "action") {
        const action = node.data.action
        setActionType(action.type)
        setActionConfig(action.config)
        setEditingNodeId(node.id)
        setActionDialogOpen(true)
      }
    }
  }

  const handleNodeContextMenu = (event: React.MouseEvent, node: Node) => {
    event.preventDefault()
    if (node.id !== "trigger") {
      handleDeleteNode(node.id)
    }
  }

  const handleAddCondition = () => {
    if (!conditionField || !conditionValue) return

    const newCondition = {
      field: conditionField,
      operator: conditionOperator,
      value: conditionValue,
      logicalOperator: conditionLogicalOp,
    }

    if (editingNodeId) {
      const index = parseInt(editingNodeId.split("-")[1])
      const updated = [...conditions]
      updated[index] = newCondition
      onConditionsChange(updated)
      setEditingNodeId(null)
    } else {
      onConditionsChange([...conditions, newCondition])
    }

    setConditionField("")
    setConditionValue("")
    setConditionOperator("equals")
    setConditionDialogOpen(false)
  }

  const handleAddAction = () => {
    if (!actionType) return

    const newAction = {
      type: actionType,
      config: actionConfig,
    }

    if (editingNodeId) {
      const index = parseInt(editingNodeId.split("-")[1])
      const updated = [...actions]
      updated[index] = newAction
      onActionsChange(updated)
      setEditingNodeId(null)
    } else {
      onActionsChange([...actions, newAction])
    }

    setActionType("send_email")
    setActionConfig({})
    setActionDialogOpen(false)
  }

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId.startsWith("condition-")) {
      const index = parseInt(nodeId.split("-")[1])
      onConditionsChange(conditions.filter((_, i) => i !== index))
    } else if (nodeId.startsWith("action-")) {
      const index = parseInt(nodeId.split("-")[1])
      onActionsChange(actions.filter((_, i) => i !== index))
    }
  }

  const renderActionConfig = () => {
    switch (actionType) {
      case "send_email":
        return (
          <div className="space-y-4">
            <div>
              <Label>אל</Label>
              <Input
                value={actionConfig.to || ""}
                onChange={(e) =>
                  setActionConfig({ ...actionConfig, to: e.target.value })
                }
                placeholder="customer.email או כתובת אימייל"
                className="mt-1"
              />
            </div>
            <div>
              <Label>נושא</Label>
              <Input
                value={actionConfig.subject || ""}
                onChange={(e) =>
                  setActionConfig({ ...actionConfig, subject: e.target.value })
                }
                placeholder="נושא האימייל"
                className="mt-1"
              />
            </div>
            <div>
              <Label>תוכן</Label>
              <textarea
                value={actionConfig.template || ""}
                onChange={(e) =>
                  setActionConfig({ ...actionConfig, template: e.target.value })
                }
                placeholder="תוכן האימייל (HTML)"
                className="mt-1 w-full min-h-[100px] p-2 border rounded-md"
                rows={5}
              />
            </div>
          </div>
        )

      case "add_customer_tag":
        return (
          <div className="space-y-4">
            <div>
              <Label>תגים (מופרדים בפסיק)</Label>
              <Input
                value={actionConfig.tags || ""}
                onChange={(e) =>
                  setActionConfig({
                    ...actionConfig,
                    tags: e.target.value.split(",").map((t) => t.trim()),
                  })
                }
                placeholder="VIP, Premium, וכו'"
                className="mt-1"
              />
            </div>
          </div>
        )

      case "update_order_status":
        return (
          <div className="space-y-4">
            <div>
              <Label>סטטוס חדש</Label>
              <Select
                value={actionConfig.status || ""}
                onValueChange={(value) =>
                  setActionConfig({ ...actionConfig, status: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFIRMED">מאושר</SelectItem>
                  <SelectItem value="PROCESSING">בטיפול</SelectItem>
                  <SelectItem value="SHIPPED">נשלח</SelectItem>
                  <SelectItem value="DELIVERED">נמסר</SelectItem>
                  <SelectItem value="CANCELLED">בוטל</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case "create_notification":
        return (
          <div className="space-y-4">
            <div>
              <Label>כותרת</Label>
              <Input
                value={actionConfig.title || ""}
                onChange={(e) =>
                  setActionConfig({ ...actionConfig, title: e.target.value })
                }
                placeholder="כותרת ההתראה"
                className="mt-1"
              />
            </div>
            <div>
              <Label>הודעה</Label>
              <textarea
                value={actionConfig.message || ""}
                onChange={(e) =>
                  setActionConfig({ ...actionConfig, message: e.target.value })
                }
                placeholder="תוכן ההתראה"
                className="mt-1 w-full min-h-[80px] p-2 border rounded-md"
                rows={3}
              />
            </div>
          </div>
        )

      case "webhook":
        return (
          <div className="space-y-4">
            <div>
              <Label>URL</Label>
              <Input
                value={actionConfig.url || ""}
                onChange={(e) =>
                  setActionConfig({ ...actionConfig, url: e.target.value })
                }
                placeholder="https://example.com/webhook"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={actionConfig.method || "POST"}
                onValueChange={(value) =>
                  setActionConfig({ ...actionConfig, method: value })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="POST">POST</SelectItem>
                  <SelectItem value="GET">GET</SelectItem>
                  <SelectItem value="PUT">PUT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      {/* Trigger Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5 text-purple-600" />
            התחל כאשר...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={trigger?.type || ""}
            onValueChange={(value) => onTriggerChange({ type: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="בחר אירוע" />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((event) => (
                <SelectItem key={event.value} value={event.value}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Flow Canvas */}
      {trigger && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>זרימת האוטומציה</span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConditionDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף תנאי
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionDialogOpen(true)}
                >
                  <Plus className="w-4 h-4 ml-2" />
                  הוסף פעולה
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{ width: "100%", height: "600px", direction: "rtl" }}>
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={handleNodeClick}
                onNodeContextMenu={handleNodeContextMenu}
                nodeTypes={nodeTypes}
                defaultViewport={{ x: 0, y: 0, zoom: 0.7 }}
                className="bg-gray-50"
                defaultEdgeOptions={{
                  type: "smoothstep",
                  animated: true,
                }}
                deleteKeyCode="Delete"
                snapToGrid
                snapGrid={[20, 20]}
                proOptions={{ hideAttribution: true }}
              >
                <Background />
                <Controls />
                <MiniMap 
                  nodeColor={(node) => {
                    if (node.type === 'trigger') return '#9333ea'
                    if (node.type === 'condition') return '#3b82f6'
                    if (node.type === 'action') return '#10b981'
                    return '#6b7280'
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              </ReactFlow>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Condition Dialog */}
      <Dialog open={conditionDialogOpen} onOpenChange={setConditionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הוסף תנאי</DialogTitle>
            <DialogDescription>
              הגדר תנאי שיקבע מתי האוטומציה תרוץ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>שדה</Label>
              <Input
                value={conditionField}
                onChange={(e) => setConditionField(e.target.value)}
                placeholder="לדוגמה: order.total, customer.tier"
                className="mt-1"
              />
            </div>
            <div>
              <Label>אופרטור</Label>
              <Select
                value={conditionOperator}
                onValueChange={setConditionOperator}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.value} value={op.value}>
                      {op.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>ערך</Label>
              <Input
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="הערך לבדיקה"
                className="mt-1"
              />
            </div>
            {conditions.length > 0 && (
              <div>
                <Label>חיבור לוגי</Label>
                <Select
                  value={conditionLogicalOp}
                  onValueChange={(value: "AND" | "OR") =>
                    setConditionLogicalOp(value)
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AND">וגם (AND)</SelectItem>
                    <SelectItem value="OR">או (OR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConditionDialogOpen(false)
                setEditingNodeId(null)
              }}
            >
              ביטול
            </Button>
            <Button onClick={handleAddCondition}>
              {editingNodeId ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>הוסף פעולה</DialogTitle>
            <DialogDescription>
              בחר פעולה שתתבצע כאשר האוטומציה תרוץ
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>סוג פעולה</Label>
              <Select value={actionType} onValueChange={setActionType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="בחר סוג פעולה">
                    {(() => {
                      const selected = actionTypes.find((at) => at.value === actionType)
                      if (!selected) return null
                      const Icon = selected.icon
                      return (
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span>{selected.label}</span>
                        </div>
                      )
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {actionTypes.map((at) => {
                    const Icon = at.icon
                    return (
                      <SelectItem key={at.value} value={at.value}>
                        <div className="flex items-center gap-2 w-full">
                          <Icon className="w-4 h-4 flex-shrink-0" />
                          <div className="flex-1 text-right">
                            <div className="font-medium">{at.label}</div>
                            <div className="text-xs text-gray-500">
                              {at.description}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {renderActionConfig()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setActionDialogOpen(false)
                setEditingNodeId(null)
              }}
            >
              ביטול
            </Button>
            <Button onClick={handleAddAction}>
              {editingNodeId ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
