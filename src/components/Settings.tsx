import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Save, 
  AlertCircle,
  Loader2,
  BarChart3,
  Shield,
  Trash,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  api, 
  type ClaudeSettings,
  type ClaudeInstallation
} from "@/lib/api";
import { cn } from "@/lib/utils";
import { Toast, ToastContainer } from "@/components/ui/toast";
import { ClaudeVersionSelector } from "./ClaudeVersionSelector";
import { StorageTab } from "./StorageTab";
import { HooksEditor } from "./HooksEditor";
import { SlashCommandsManager } from "./SlashCommandsManager";
import { ProxySettings } from "./ProxySettings";
import { AnalyticsConsent } from "./AnalyticsConsent";
import { useTheme, useTrackEvent } from "@/hooks";
import { analytics } from "@/lib/analytics";

interface SettingsProps {
  /**
   * Callback to go back to the main view
   */
  onBack: () => void;
  /**
   * Optional className for styling
   */
  className?: string;
}

interface PermissionRule {
  id: string;
  value: string;
}

interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
}

/**
 * Comprehensive Settings UI for managing Claude Code settings
 * Provides a no-code interface for editing the settings.json file
 */
export const Settings: React.FC<SettingsProps> = ({
  onBack,
  className,
}) => {
  const [settings, setSettings] = useState<ClaudeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("general");
  const [currentBinaryPath, setCurrentBinaryPath] = useState<string | null>(null);
  const [selectedInstallation, setSelectedInstallation] = useState<ClaudeInstallation | null>(null);
  const [binaryPathChanged, setBinaryPathChanged] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Permission rules state
  const [allowRules, setAllowRules] = useState<PermissionRule[]>([]);
  const [denyRules, setDenyRules] = useState<PermissionRule[]>([]);
  
  // Environment variables state
  const [envVars, setEnvVars] = useState<EnvironmentVariable[]>([]);
  
  // Hooks state
  const [userHooksChanged, setUserHooksChanged] = useState(false);
  const getUserHooks = React.useRef<(() => any) | null>(null);
  
  // Theme hook
  const { theme, setTheme, customColors, setCustomColors } = useTheme();
  
  // Proxy state
  const [proxySettingsChanged, setProxySettingsChanged] = useState(false);
  const saveProxySettings = React.useRef<(() => Promise<void>) | null>(null);
  
  // Analytics state
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [analyticsConsented, setAnalyticsConsented] = useState(false);
  const [showAnalyticsConsent, setShowAnalyticsConsent] = useState(false);
  const trackEvent = useTrackEvent();
  
  // Load settings on mount
  useEffect(() => {
    loadSettings();
    loadClaudeBinaryPath();
    loadAnalyticsSettings();
  }, []);

  /**
   * Loads analytics settings
   */
  const loadAnalyticsSettings = async () => {
    const settings = analytics.getSettings();
    if (settings) {
      setAnalyticsEnabled(settings.enabled);
      setAnalyticsConsented(settings.hasConsented);
    }
  };

  /**
   * Loads the current Claude binary path
   */
  const loadClaudeBinaryPath = async () => {
    try {
      const path = await api.getClaudeBinaryPath();
      setCurrentBinaryPath(path);
    } catch (err) {
      console.error("Failed to load Claude binary path:", err);
    }
  };

  /**
   * Loads the current Claude settings
   */
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const loadedSettings = await api.getClaudeSettings();
      
      // Ensure loadedSettings is an object
      if (!loadedSettings || typeof loadedSettings !== 'object') {
        console.warn("Loaded settings is not an object:", loadedSettings);
        setSettings({});
        return;
      }
      
      setSettings(loadedSettings);

      // Parse permissions
      if (loadedSettings.permissions && typeof loadedSettings.permissions === 'object') {
        if (Array.isArray(loadedSettings.permissions.allow)) {
          setAllowRules(
            loadedSettings.permissions.allow.map((rule: string, index: number) => ({
              id: `allow-${index}`,
              value: rule,
            }))
          );
        }
        if (Array.isArray(loadedSettings.permissions.deny)) {
          setDenyRules(
            loadedSettings.permissions.deny.map((rule: string, index: number) => ({
              id: `deny-${index}`,
              value: rule,
            }))
          );
        }
      }

      // Parse environment variables
      if (loadedSettings.env && typeof loadedSettings.env === 'object' && !Array.isArray(loadedSettings.env)) {
        setEnvVars(
          Object.entries(loadedSettings.env).map(([key, value], index) => ({
            id: `env-${index}`,
            key,
            value: value as string,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setError("加载设置失败。请确保 ~/.claude 目录存在。");
      setSettings({});
    } finally {
      setLoading(false);
    }
  };

  /**
   * Saves the current settings
   */
  const saveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setToast(null);

      // Build the settings object
      const updatedSettings: ClaudeSettings = {
        ...settings,
        permissions: {
          allow: allowRules.map(rule => rule.value).filter(v => v && String(v).trim()),
          deny: denyRules.map(rule => rule.value).filter(v => v && String(v).trim()),
        },
        env: envVars.reduce((acc, { key, value }) => {
          if (key && String(key).trim() && value && String(value).trim()) {
            acc[key] = String(value);
          }
          return acc;
        }, {} as Record<string, string>),
      };

      await api.saveClaudeSettings(updatedSettings);
      setSettings(updatedSettings);

      // Save Claude binary path if changed
      if (binaryPathChanged && selectedInstallation) {
        await api.setClaudeBinaryPath(selectedInstallation.path);
        setCurrentBinaryPath(selectedInstallation.path);
        setBinaryPathChanged(false);
      }

      // Save user hooks if changed
      if (userHooksChanged && getUserHooks.current) {
        const hooks = getUserHooks.current();
        await api.updateHooksConfig('user', hooks);
        setUserHooksChanged(false);
      }

      // Save proxy settings if changed
      if (proxySettingsChanged && saveProxySettings.current) {
        await saveProxySettings.current();
        setProxySettingsChanged(false);
      }

      setToast({ message: "设置保存成功！", type: "success" });
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("保存设置失败。");
      setToast({ message: "保存设置失败", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  /**
   * Updates a simple setting value
   */
  const updateSetting = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  /**
   * Adds a new permission rule
   */
  const addPermissionRule = (type: "allow" | "deny") => {
    const newRule: PermissionRule = {
      id: `${type}-${Date.now()}`,
      value: "",
    };
    
    if (type === "allow") {
      setAllowRules(prev => [...prev, newRule]);
    } else {
      setDenyRules(prev => [...prev, newRule]);
    }
  };

  /**
   * Updates a permission rule
   */
  const updatePermissionRule = (type: "allow" | "deny", id: string, value: string) => {
    if (type === "allow") {
      setAllowRules(prev => prev.map(rule => 
        rule.id === id ? { ...rule, value } : rule
      ));
    } else {
      setDenyRules(prev => prev.map(rule => 
        rule.id === id ? { ...rule, value } : rule
      ));
    }
  };

  /**
   * Removes a permission rule
   */
  const removePermissionRule = (type: "allow" | "deny", id: string) => {
    if (type === "allow") {
      setAllowRules(prev => prev.filter(rule => rule.id !== id));
    } else {
      setDenyRules(prev => prev.filter(rule => rule.id !== id));
    }
  };

  /**
   * Adds a new environment variable
   */
  const addEnvVar = () => {
    const newVar: EnvironmentVariable = {
      id: `env-${Date.now()}`,
      key: "",
      value: "",
    };
    setEnvVars(prev => [...prev, newVar]);
  };

  /**
   * Updates an environment variable
   */
  const updateEnvVar = (id: string, field: "key" | "value", value: string) => {
    setEnvVars(prev => prev.map(envVar => 
      envVar.id === id ? { ...envVar, [field]: value } : envVar
    ));
  };

  /**
   * Removes an environment variable
   */
  const removeEnvVar = (id: string) => {
    setEnvVars(prev => prev.filter(envVar => envVar.id !== id));
  };

  /**
   * Handle Claude installation selection
   */
  const handleClaudeInstallationSelect = (installation: ClaudeInstallation) => {
    setSelectedInstallation(installation);
    setBinaryPathChanged(installation.path !== currentBinaryPath);
  };

  return (
    <div className={cn("flex flex-col h-full bg-background text-foreground", className)}>
      <div className="max-w-4xl mx-auto w-full flex flex-col h-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between p-4 border-b border-border"
        >
        <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-semibold">设置</h2>
          <p className="text-xs text-muted-foreground">
              配置 Claude Code 首选项
          </p>
          </div>
        </div>
        
        <Button
          onClick={saveSettings}
          disabled={saving || loading}
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              保存设置
            </>
          )}
        </Button>
      </motion.div>
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mx-4 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/50 flex items-center gap-2 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Content */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-9 w-full">
              <TabsTrigger value="general">通用</TabsTrigger>
              <TabsTrigger value="permissions">权限</TabsTrigger>
              <TabsTrigger value="environment">环境</TabsTrigger>
              <TabsTrigger value="advanced">高级</TabsTrigger>
              <TabsTrigger value="hooks">钩子</TabsTrigger>
              <TabsTrigger value="commands">命令</TabsTrigger>
              <TabsTrigger value="storage">存储</TabsTrigger>
              <TabsTrigger value="proxy">代理</TabsTrigger>
              <TabsTrigger value="analytics">分析</TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general" className="space-y-6">
              <Card className="p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold mb-4">通用设置</h3>
                  
                  <div className="space-y-4">
                    {/* Theme Selector */}
                    <div className="space-y-2">
                      <Label htmlFor="theme">主题</Label>
                      <Select
                        value={theme}
                        onValueChange={(value) => setTheme(value as any)}
                      >
                        <SelectTrigger id="theme" className="w-full">
                          <SelectValue placeholder="选择主题" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dark">深色</SelectItem>
                          <SelectItem value="gray">灰色</SelectItem>
                          <SelectItem value="light">浅色</SelectItem>
                          <SelectItem value="custom">自定义</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        为界面选择您喜欢的颜色主题
                      </p>
                    </div>
                    
                    {/* Custom Color Editor */}
                    {theme === 'custom' && (
                      <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
                        <h4 className="text-sm font-medium">自定义主题颜色</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Background Color */}
                          <div className="space-y-2">
                            <Label htmlFor="color-background" className="text-xs">背景</Label>
                            <div className="flex gap-2">
                              <Input
                                id="color-background"
                                type="text"
                                value={customColors.background}
                                onChange={(e) => setCustomColors({ background: e.target.value })}
                                placeholder="oklch(0.12 0.01 240)"
                                className="font-mono text-xs"
                              />
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: customColors.background }}
                              />
                            </div>
                          </div>
                          
                          {/* Foreground Color */}
                          <div className="space-y-2">
                            <Label htmlFor="color-foreground" className="text-xs">前景</Label>
                            <div className="flex gap-2">
                              <Input
                                id="color-foreground"
                                type="text"
                                value={customColors.foreground}
                                onChange={(e) => setCustomColors({ foreground: e.target.value })}
                                placeholder="oklch(0.98 0.01 240)"
                                className="font-mono text-xs"
                              />
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: customColors.foreground }}
                              />
                            </div>
                          </div>
                          
                          {/* Primary Color */}
                          <div className="space-y-2">
                            <Label htmlFor="color-primary" className="text-xs">主色</Label>
                            <div className="flex gap-2">
                              <Input
                                id="color-primary"
                                type="text"
                                value={customColors.primary}
                                onChange={(e) => setCustomColors({ primary: e.target.value })}
                                placeholder="oklch(0.98 0.01 240)"
                                className="font-mono text-xs"
                              />
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: customColors.primary }}
                              />
                            </div>
                          </div>
                          
                          {/* Card Color */}
                          <div className="space-y-2">
                            <Label htmlFor="color-card" className="text-xs">卡片</Label>
                            <div className="flex gap-2">
                              <Input
                                id="color-card"
                                type="text"
                                value={customColors.card}
                                onChange={(e) => setCustomColors({ card: e.target.value })}
                                placeholder="oklch(0.14 0.01 240)"
                                className="font-mono text-xs"
                              />
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: customColors.card }}
                              />
                            </div>
                          </div>
                          
                          {/* Accent Color */}
                          <div className="space-y-2">
                            <Label htmlFor="color-accent" className="text-xs">强调色</Label>
                            <div className="flex gap-2">
                              <Input
                                id="color-accent"
                                type="text"
                                value={customColors.accent}
                                onChange={(e) => setCustomColors({ accent: e.target.value })}
                                placeholder="oklch(0.16 0.01 240)"
                                className="font-mono text-xs"
                              />
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: customColors.accent }}
                              />
                            </div>
                          </div>
                          
                          {/* Destructive Color */}
                          <div className="space-y-2">
                            <Label htmlFor="color-destructive" className="text-xs">破坏性色</Label>
                            <div className="flex gap-2">
                              <Input
                                id="color-destructive"
                                type="text"
                                value={customColors.destructive}
                                onChange={(e) => setCustomColors({ destructive: e.target.value })}
                                placeholder="oklch(0.6 0.2 25)"
                                className="font-mono text-xs"
                              />
                              <div 
                                className="w-10 h-10 rounded border"
                                style={{ backgroundColor: customColors.destructive }}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-xs text-muted-foreground">
                          使用 CSS 颜色值（hex、rgb、oklch 等）。更改立即生效。
                        </p>
                      </div>
                    )}
                    
                    {/* Include Co-authored By */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="coauthored">包含“由Claude协作”</Label>
                        <p className="text-xs text-muted-foreground">
                          在 git 提交和拉取请求中添加 Claude 归属
                        </p>
                      </div>
                      <Switch
                        id="coauthored"
                        checked={settings?.includeCoAuthoredBy !== false}
                        onCheckedChange={(checked) => updateSetting("includeCoAuthoredBy", checked)}
                      />
                    </div>
                    
                    {/* Verbose Output */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 flex-1">
                        <Label htmlFor="verbose">详细输出</Label>
                        <p className="text-xs text-muted-foreground">
                          显示完整的 bash 和命令输出
                        </p>
                      </div>
                      <Switch
                        id="verbose"
                        checked={settings?.verbose === true}
                        onCheckedChange={(checked) => updateSetting("verbose", checked)}
                      />
                    </div>
                    
                    {/* Cleanup Period */}
                    <div className="space-y-2">
                      <Label htmlFor="cleanup">聊天记录保留（天）</Label>
                      <Input
                        id="cleanup"
                        type="number"
                        min="1"
                        placeholder="30"
                        value={settings?.cleanupPeriodDays || ""}
                        onChange={(e) => {
                          const value = e.target.value ? parseInt(e.target.value) : undefined;
                          updateSetting("cleanupPeriodDays", value);
                        }}
                      />
                      <p className="text-xs text-muted-foreground">
                        本地保留聊天记录的时间（默认：30天）
                      </p>
                    </div>
                    
                    {/* Claude Binary Path Selector */}
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Claude Code 安装</Label>
                        <p className="text-xs text-muted-foreground mb-4">
                          选择要使用的 Claude Code 安装。
                        </p>
                      </div>
                      <ClaudeVersionSelector
                        selectedPath={currentBinaryPath}
                        onSelect={handleClaudeInstallationSelect}
                      />
                      {binaryPathChanged && (
                        <p className="text-xs text-amber-600 dark:text-amber-400">
                          ⚠️ Claude 二进制路径已更改。请记得保存您的设置。
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            {/* Permissions Settings */}
            <TabsContent value="permissions" className="space-y-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold mb-2">权限规则</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      控制 Claude Code 可以在无需手动批准的情况下使用的工具
                    </p>
                  </div>
                  
                  {/* Allow Rules */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-green-500">允许规则</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addPermissionRule("allow")}
                        className="gap-2 hover:border-green-500/50 hover:text-green-500"
                      >
                        <Plus className="h-3 w-3" />
                        添加规则
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {allowRules.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          未配置允许规则。Claude 会对所有工具请求批准。
                        </p>
                      ) : (
                        allowRules.map((rule) => (
                          <motion.div
                            key={rule.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <Input
                              placeholder="e.g., Bash(npm run test:*)"
                              value={rule.value}
                              onChange={(e) => updatePermissionRule("allow", rule.id, e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePermissionRule("allow", rule.id)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  {/* Deny Rules */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium text-red-500">拒绝规则</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addPermissionRule("deny")}
                        className="gap-2 hover:border-red-500/50 hover:text-red-500"
                      >
                        <Plus className="h-3 w-3" />
                        添加规则
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {denyRules.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-2">
                          未配置拒绝规则。
                        </p>
                      ) : (
                        denyRules.map((rule) => (
                          <motion.div
                            key={rule.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2"
                          >
                            <Input
                              placeholder="e.g., Bash(curl:*)"
                              value={rule.value}
                              onChange={(e) => updatePermissionRule("deny", rule.id, e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removePermissionRule("deny", rule.id)}
                              className="h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>示例：</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Bash</code> - 允许所有 bash 命令</li>
                      <li>• <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Bash(npm run build)</code> - 允许精确命令</li>
                      <li>• <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Bash(npm run test:*)</code> - 允许带有前缀的命令</li>
                      <li>• <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Read(~/.zshrc)</code> - 允许读取特定文件</li>
                      <li>• <code className="px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400">Edit(docs/**)</code> - 允许编辑 docs 目录中的文件</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            {/* Environment Variables */}
            <TabsContent value="environment" className="space-y-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-semibold">环境变量</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        应用于每个 Claude Code 会话的环境变量
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addEnvVar}
                      className="gap-2"
                    >
                      <Plus className="h-3 w-3" />
                      添加变量
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {envVars.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        未配置环境变量。
                      </p>
                    ) : (
                      envVars.map((envVar) => (
                        <motion.div
                          key={envVar.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <Input
                            placeholder="KEY"
                            value={envVar.key}
                            onChange={(e) => updateEnvVar(envVar.id, "key", e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                          <span className="text-muted-foreground">=</span>
                          <Input
                            placeholder="value"
                            value={envVar.value}
                            onChange={(e) => updateEnvVar(envVar.id, "value", e.target.value)}
                            className="flex-1 font-mono text-sm"
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeEnvVar(envVar.id)}
                            className="h-8 w-8 hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      ))
                    )}
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      <strong>常见变量：</strong>
                    </p>
                    <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                      <li>• <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">CLAUDE_CODE_ENABLE_TELEMETRY</code> - 启用/禁用遥测（0 或1）</li>
                      <li>• <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">ANTHROPIC_MODEL</code> - 自定义模型名称</li>
                      <li>• <code className="px-1 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400">DISABLE_COST_WARNINGS</code> - 禁用成本警告（1）</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </TabsContent>
            {/* Advanced Settings */}
            <TabsContent value="advanced" className="space-y-6">
              <Card className="p-6">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-base font-semibold mb-4">高级设置</h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      为高级用户提供的额外配置选项
                    </p>
                  </div>
                  
                  {/* API Key Helper */}
                  <div className="space-y-2">
                    <Label htmlFor="apiKeyHelper">API 密钥助手脚本</Label>
                    <Input
                      id="apiKeyHelper"
                      placeholder="/path/to/generate_api_key.sh"
                      value={settings?.apiKeyHelper || ""}
                      onChange={(e) => updateSetting("apiKeyHelper", e.target.value || undefined)}
                    />
                    <p className="text-xs text-muted-foreground">
                      用于为 API 请求生成身份验证值的自定义脚本
                    </p>
                  </div>
                  
                  {/* Raw JSON Editor */}
                  <div className="space-y-2">
                    <Label>原始设置（JSON）</Label>
                    <div className="p-3 rounded-md bg-muted font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                      <pre>{JSON.stringify(settings, null, 2)}</pre>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      这里显示将保存到 ~/.claude/settings.json 的原始JSON
                    </p>
                  </div>
                </div>
              </Card>
            </TabsContent>
            
            {/* Hooks Settings */}
            <TabsContent value="hooks" className="space-y-6">
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold mb-2">用户钩子</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      配置适用于您用户账户所有 Claude Code 会话的钩子。
                      These are stored in <code className="mx-1 px-2 py-1 bg-muted rounded text-xs">~/.claude/settings.json</code>
                    </p>
                  </div>
                  
                  <HooksEditor
                    key={activeTab}
                    scope="user"
                    className="border-0"
                    hideActions={true}
                    onChange={(hasChanges, getHooks) => {
                      setUserHooksChanged(hasChanges);
                      getUserHooks.current = getHooks;
                    }}
                  />
                </div>
              </Card>
            </TabsContent>
            
            {/* Commands Tab */}
            <TabsContent value="commands">
              <Card className="p-6">
                <SlashCommandsManager className="p-0" />
              </Card>
            </TabsContent>
            
            {/* Storage Tab */}
            <TabsContent value="storage">
              <StorageTab />
            </TabsContent>
            
            {/* Proxy Settings */}
            <TabsContent value="proxy">
              <Card className="p-6">
                <ProxySettings 
                  setToast={setToast}
                  onChange={(hasChanges, _getSettings, save) => {
                    setProxySettingsChanged(hasChanges);
                    saveProxySettings.current = save;
                  }}
                />
              </Card>
            </TabsContent>
            
            {/* Analytics Settings */}
            <TabsContent value="analytics" className="space-y-6">
              <Card className="p-6 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <BarChart3 className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-base font-semibold">分析设置</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Analytics Toggle */}
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="analytics-enabled" className="text-base">启用分析</Label>
                        <p className="text-sm text-muted-foreground">
                          通过共享匿名使用数据帮助改进 Claudia
                        </p>
                      </div>
                      <Switch
                        id="analytics-enabled"
                        checked={analyticsEnabled}
                        onCheckedChange={async (checked) => {
                          if (checked && !analyticsConsented) {
                            setShowAnalyticsConsent(true);
                          } else if (checked) {
                            await analytics.enable();
                            setAnalyticsEnabled(true);
                            trackEvent.settingsChanged('analytics_enabled', true);
                            setToast({ message: "分析已启用", type: "success" });
                          } else {
                            await analytics.disable();
                            setAnalyticsEnabled(false);
                            trackEvent.settingsChanged('analytics_enabled', false);
                            setToast({ message: "分析已禁用", type: "success" });
                          }
                        }}
                      />
                    </div>
                    
                    {/* Privacy Info */}
                    <div className="rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/20 p-4">
                      <div className="flex gap-3">
                        <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-2">
                          <p className="font-medium text-blue-900 dark:text-blue-100">您的隐私受到保护</p>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                            <li>• 不收集个人信息</li>
                            <li>• 不收集文件内容、路径或项目名称</li>
                            <li>• 所有数据都是匿名的，使用随机ID</li>
                            <li>• 您可以随时禁用分析</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    {/* Data Collection Info */}
                    {analyticsEnabled && (
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-2">我们收集的内容：</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• 功能使用模式</li>
                            <li>• 性能指标</li>
                            <li>• 错误报告（不包含敏感数据）</li>
                            <li>• 会话频率和持续时间</li>
                          </ul>
                        </div>
                        
                        {/* Delete Data Button */}
                        <div className="pt-4 border-t">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                              await analytics.deleteAllData();
                              setAnalyticsEnabled(false);
                              setAnalyticsConsented(false);
                              setToast({ message: "所有分析数据已删除", type: "success" });
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            删除所有分析数据
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
      </div>
      
      {/* Toast Notification */}
      <ToastContainer>
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            onDismiss={() => setToast(null)}
          />
        )}
      </ToastContainer>
      
      {/* Analytics Consent Dialog */}
      <AnalyticsConsent
        open={showAnalyticsConsent}
        onOpenChange={setShowAnalyticsConsent}
        onComplete={async () => {
          await loadAnalyticsSettings();
          setShowAnalyticsConsent(false);
        }}
      />
    </div>
  );
}; 
