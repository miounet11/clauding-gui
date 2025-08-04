import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Settings,
  Save,
  Trash2,
  HardDrive,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SelectComponent, type SelectOption } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { api, type CheckpointStrategy } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/hooks/useI18n";

interface CheckpointSettingsProps {
  sessionId: string;
  projectId: string;
  projectPath: string;
  onClose?: () => void;
  className?: string;
}

/**
 * CheckpointSettings component for managing checkpoint configuration
 * 
 * @example
 * <CheckpointSettings 
 *   sessionId={session.id}
 *   projectId={session.project_id}
 *   projectPath={projectPath}
 * />
 */
export const CheckpointSettings: React.FC<CheckpointSettingsProps> = ({
  sessionId,
  projectId,
  projectPath,
  onClose,
  className,
}) => {
  const { t } = useI18n();
  const [autoCheckpointEnabled, setAutoCheckpointEnabled] = useState(true);
  const [checkpointStrategy, setCheckpointStrategy] = useState<CheckpointStrategy>("smart");
  const [totalCheckpoints, setTotalCheckpoints] = useState(0);
  const [keepCount, setKeepCount] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const strategyOptions: SelectOption[] = [
    { value: "manual", label: t('checkpoint:strategy.manual') },
    { value: "per_prompt", label: t('checkpoint:strategy.perPrompt') },
    { value: "per_tool_use", label: t('checkpoint:strategy.perToolUse') },
    { value: "smart", label: t('checkpoint:strategy.smart') },
  ];

  useEffect(() => {
    loadSettings();
  }, [sessionId, projectId, projectPath]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const settings = await api.getCheckpointSettings(sessionId, projectId, projectPath);
      setAutoCheckpointEnabled(settings.auto_checkpoint_enabled);
      setCheckpointStrategy(settings.checkpoint_strategy);
      setTotalCheckpoints(settings.total_checkpoints);
    } catch (err) {
      console.error("Failed to load checkpoint settings:", err);
      setError(t('checkpoint:messages.loadFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      await api.updateCheckpointSettings(
        sessionId,
        projectId,
        projectPath,
        autoCheckpointEnabled,
        checkpointStrategy
      );
      
      setSuccessMessage(t('checkpoint:messages.saveSuccess'));
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error("Failed to save checkpoint settings:", err);
      setError(t('checkpoint:messages.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCleanup = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccessMessage(null);
      
      const removed = await api.cleanupOldCheckpoints(
        sessionId,
        projectId,
        projectPath,
        keepCount
      );
      
      setSuccessMessage(t('checkpoint:messages.cleanupSuccess').replace('{{count}}', removed.toString()));
      setTimeout(() => setSuccessMessage(null), 3000);
      
      // Reload settings to get updated count
      await loadSettings();
    } catch (err) {
      console.error("Failed to cleanup checkpoints:", err);
      setError(t('checkpoint:messages.cleanupFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={cn("space-y-6", className)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h3 className="text-lg font-semibold">{t('checkpoint:title')}</h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common:actions.close')}
          </Button>
        )}
      </div>

      {/* Experimental Feature Warning */}
      <div className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 p-3">
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
          <div className="text-xs">
            <p className="font-medium text-yellow-600">{t('checkpoint:experimentalWarning.title')}</p>
            <p className="text-yellow-600/80">
              {t('checkpoint:experimentalWarning.description')}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </motion.div>
      )}

      {successMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-xs text-green-600"
        >
          {successMessage}
        </motion.div>
      )}

      <div className="space-y-4">
        {/* Auto-checkpoint toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-checkpoint">{t('checkpoint:autoCheckpoint.label')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('checkpoint:autoCheckpoint.description')}
            </p>
          </div>
          <Switch
            id="auto-checkpoint"
            checked={autoCheckpointEnabled}
            onCheckedChange={setAutoCheckpointEnabled}
            disabled={isLoading}
          />
        </div>

        {/* Checkpoint strategy */}
        <div className="space-y-2">
          <Label htmlFor="strategy">{t('checkpoint:strategy.label')}</Label>
          <SelectComponent
            value={checkpointStrategy}
            onValueChange={(value: string) => setCheckpointStrategy(value as CheckpointStrategy)}
            options={strategyOptions}
            disabled={isLoading || !autoCheckpointEnabled}
          />
          <p className="text-xs text-muted-foreground">
            {checkpointStrategy === "manual" && t('checkpoint:strategy.manual')}
            {checkpointStrategy === "per_prompt" && t('checkpoint:strategy.perPrompt')}
            {checkpointStrategy === "per_tool_use" && t('checkpoint:strategy.perToolUse')}
            {checkpointStrategy === "smart" && t('checkpoint:strategy.smart')}
          </p>
        </div>

        {/* Save button */}
        <Button
          onClick={handleSaveSettings}
          disabled={isLoading || isSaving}
          className="w-full"
        >
          {isSaving ? (
            <>
              <Save className="h-4 w-4 mr-2 animate-spin" />
              {t('checkpoint:buttons.saving')}
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('checkpoint:buttons.saveSettings')}
            </>
          )}
        </Button>
      </div>

      <div className="border-t pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>{t('checkpoint:storageManagement.title')}</Label>
            <p className="text-sm text-muted-foreground">
              {t('checkpoint:storageManagement.totalCheckpoints')} {totalCheckpoints}
            </p>
          </div>
          <HardDrive className="h-5 w-5 text-muted-foreground" />
        </div>

        {/* Cleanup settings */}
        <div className="space-y-2">
          <Label htmlFor="keep-count">{t('checkpoint:storageManagement.keepRecent')}</Label>
          <div className="flex gap-2">
            <Input
              id="keep-count"
              type="number"
              min="1"
              max="100"
              value={keepCount}
              onChange={(e) => setKeepCount(parseInt(e.target.value) || 10)}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              variant="destructive"
              onClick={handleCleanup}
              disabled={isLoading || totalCheckpoints <= keepCount}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('checkpoint:buttons.cleanUp')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t('checkpoint:storageManagement.cleanupDescription').replace('{{count}}', keepCount.toString())}
          </p>
        </div>
      </div>
    </motion.div>
  );
}; 