
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Database, Download, Upload, Shield } from 'lucide-react';
import { trpc } from '@/utils/trpc';

export function DatabaseBackup() {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    setError('');
    setSuccess('');

    try {
      await trpc.createDatabaseBackup.mutate();
      setSuccess('Database backup created successfully. Check your downloads folder.');
    } catch (error) {
      console.error('Failed to create database backup:', error);
      setError('Failed to create database backup');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleRestoreDatabase = async () => {
    if (!selectedFile) {
      setError('Please select a backup file first');
      return;
    }

    const confirmed = confirm(
      'WARNING: This will restore the database from the backup file and overwrite all current data. ' +
      'Are you sure you want to continue?'
    );

    if (!confirmed) {
      return;
    }

    setIsRestoring(true);
    setError('');
    setSuccess('');

    try {
      // Note: In a real implementation, you'd need to properly handle file upload
      await trpc.restoreDatabase.mutate({ backupFile: selectedFile });
      setSuccess('Database restored successfully');
      setSelectedFile(null);
    } catch (error) {
      console.error('Failed to restore database:', error);
      setError('Failed to restore database');
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Database className="h-5 w-5" />
          <CardTitle>Database Backup</CardTitle>
        </div>
        <CardDescription>
          Create and restore database backups for data protection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="default" className="border-green-200 bg-green-50">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">{success}</AlertDescription>
          </Alert>
        )}

        {/* Create Backup */}
        <div className="space-y-4">
          <div>
            <h4 className="font-medium flex items-center space-x-2 mb-2">
              <Download className="h-4 w-4" />
              <span>Create Backup</span>
            </h4>
            <p className="text-sm text-gray-600 mb-4">
              Create a complete backup of your database including all bookings, customers, and settings.
            </p>
            <Button 
              onClick={handleCreateBackup} 
              disabled={isCreatingBackup}
              className="w-full sm:w-auto"
            >
              {isCreatingBackup ? 'Creating Backup...' : 'Create Database Backup'}
            </Button>
          </div>
        </div>

        <div className="border-t pt-6">
          {/* Restore Backup */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium flex items-center space-x-2 mb-2">
                <Upload className="h-4 w-4" />
                <span>Restore Backup</span>
              </h4>
              <p className="text-sm text-gray-600 mb-4">
                Restore your database from a previously created backup file.
              </p>
              
              <Alert className="mb-4 border-yellow-200 bg-yellow-50">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-700">
                  <strong>Warning:</strong> Restoring a backup will overwrite all current data. 
                  Make sure to create a backup of your current data before proceeding.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="backup-file">Select Backup File</Label>
                  <Input
                    id="backup-file"
                    type="file"
                    accept=".sql,.db,.backup"
                    onChange={handleFileSelect}
                    className="mt-1"
                  />
                  {selectedFile && (
                    <p className="text-sm text-gray-600 mt-2">
                      Selected file: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleRestoreDatabase}
                  disabled={isRestoring || !selectedFile}
                  variant="destructive"
                  className="w-full sm:w-auto"
                >
                  {isRestoring ? 'Restoring Database...' : 'Restore Database'}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">Backup Best Practices</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li>• Create regular backups (daily or weekly depending on usage)</li>
            <li>• Store backup files in a secure, separate location</li>
            <li>• Test restore process periodically to ensure backups are valid</li>
            <li>• Keep multiple backup versions for different time periods</li>
            <li>• Document backup and restore procedures for your team</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
