import { forwardRef, useId, useState, useCallback } from 'react';
import { Upload, X, File, Image, FileText, AlertCircle } from 'lucide-react';

type FileUploadSize = 'sm' | 'md' | 'lg';

interface FileInfo {
    name: string;
    size: number;
    type: string;
    file: File;
}

interface FileUploadProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type' | 'onChange'> {
    /** Label text */
    label?: string;
    /** Error message */
    error?: string;
    /** Helper text */
    helperText?: string;
    /** Size variant */
    size?: FileUploadSize;
    /** Required field */
    required?: boolean;
    /** Allow multiple files */
    multiple?: boolean;
    /** Accepted file types */
    accept?: string;
    /** Max file size in bytes */
    maxSize?: number;
    /** Max number of files */
    maxFiles?: number;
    /** Show file preview */
    showPreview?: boolean;
    /** Custom dropzone text */
    dropzoneText?: string;
    /** Custom browse button text */
    browseText?: string;
    /** Change handler */
    onChange?: (files: File[]) => void;
    /** Current files (controlled) */
    files?: File[];
}

const sizeClasses: Record<FileUploadSize, { padding: string; text: string; icon: number }> = {
    sm: { padding: 'p-4', text: 'text-sm', icon: 24 },
    md: { padding: 'p-6', text: 'text-sm', icon: 32 },
    lg: { padding: 'p-8', text: 'text-base', icon: 40 },
};

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
    if (type.startsWith('image/')) return Image;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
}

const FileUpload = forwardRef<HTMLInputElement, FileUploadProps>(
    (
        {
            label,
            error,
            helperText,
            size = 'md',
            required = false,
            multiple = false,
            accept,
            maxSize,
            maxFiles = 10,
            showPreview = true,
            dropzoneText = 'Drag and drop files here, or',
            browseText = 'browse',
            onChange,
            files: controlledFiles,
            className = '',
            id,
            disabled,
            ...props
        },
        ref
    ) => {
        const generatedId = useId();
        const inputId = id || generatedId;
        const [internalFiles, setInternalFiles] = useState<FileInfo[]>([]);
        const [isDragging, setIsDragging] = useState(false);
        const [validationError, setValidationError] = useState<string | null>(null);

        const files = controlledFiles
            ? controlledFiles.map(f => ({ name: f.name, size: f.size, type: f.type, file: f }))
            : internalFiles;

        const sizeConfig = sizeClasses[size];

        const validateFiles = useCallback((newFiles: File[]): { valid: File[]; error: string | null } => {
            let validFiles = [...newFiles];
            let errorMsg: string | null = null;

            // Check max files
            if (multiple && files.length + validFiles.length > maxFiles) {
                errorMsg = `Maximum ${maxFiles} files allowed`;
                validFiles = validFiles.slice(0, maxFiles - files.length);
            }

            // Check file sizes
            if (maxSize) {
                const oversized = validFiles.filter(f => f.size > maxSize);
                if (oversized.length > 0) {
                    errorMsg = `File(s) exceed maximum size of ${formatFileSize(maxSize)}`;
                    validFiles = validFiles.filter(f => f.size <= maxSize);
                }
            }

            return { valid: validFiles, error: errorMsg };
        }, [files.length, maxFiles, maxSize, multiple]);

        const handleFiles = useCallback((newFiles: File[]) => {
            const { valid, error: validationErr } = validateFiles(newFiles);
            setValidationError(validationErr);

            if (valid.length === 0) return;

            const fileInfos = valid.map(f => ({
                name: f.name,
                size: f.size,
                type: f.type,
                file: f,
            }));

            if (controlledFiles) {
                onChange?.(multiple ? [...controlledFiles, ...valid] : valid);
            } else {
                setInternalFiles(prev => multiple ? [...prev, ...fileInfos] : fileInfos);
                onChange?.(multiple ? [...files.map(f => f.file), ...valid] : valid);
            }
        }, [validateFiles, controlledFiles, onChange, multiple, files]);

        const handleDrop = useCallback((e: React.DragEvent) => {
            e.preventDefault();
            setIsDragging(false);
            if (disabled) return;

            const droppedFiles = Array.from(e.dataTransfer.files);
            handleFiles(droppedFiles);
        }, [disabled, handleFiles]);

        const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const selectedFiles = Array.from(e.target.files || []);
            handleFiles(selectedFiles);
            // Reset input so same file can be selected again
            e.target.value = '';
        };

        const removeFile = (index: number) => {
            if (controlledFiles) {
                const newFiles = controlledFiles.filter((_, i) => i !== index);
                onChange?.(newFiles);
            } else {
                setInternalFiles(prev => {
                    const newFiles = prev.filter((_, i) => i !== index);
                    onChange?.(newFiles.map(f => f.file));
                    return newFiles;
                });
            }
            setValidationError(null);
        };

        const displayError = error || validationError;

        return (
            <div className={className}>
                {/* Label */}
                {label && (
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                        {label}
                        {required && <span className="text-error-500 ml-0.5">*</span>}
                    </label>
                )}

                {/* Dropzone */}
                <div
                    onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    className={`
            relative rounded-md border-2 border-dashed transition-all
            ${sizeConfig.padding}
            ${disabled
                            ? 'bg-neutral-100 dark:bg-neutral-800 cursor-not-allowed opacity-50'
                            : 'cursor-pointer hover:border-primary-400 dark:hover:border-primary-600'
                        }
            ${isDragging
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                            : displayError
                                ? 'border-error-300 dark:border-error-700 bg-error-50 dark:bg-error-950/20'
                                : 'border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50'
                        }
          `}
                >
                    <input
                        ref={ref}
                        type="file"
                        id={inputId}
                        multiple={multiple}
                        accept={accept}
                        disabled={disabled}
                        onChange={handleInputChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                        {...props}
                    />

                    <div className="flex flex-col items-center text-center">
                        <Upload
                            size={sizeConfig.icon}
                            className={`mb-3 ${isDragging ? 'text-primary-500' : 'text-neutral-400 dark:text-neutral-500'}`}
                        />
                        <p className={`${sizeConfig.text} text-neutral-600 dark:text-neutral-400`}>
                            {dropzoneText}{' '}
                            <span className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
                                {browseText}
                            </span>
                        </p>
                        {(accept || maxSize) && (
                            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-500">
                                {accept && `Accepted: ${accept}`}
                                {accept && maxSize && ' • '}
                                {maxSize && `Max size: ${formatFileSize(maxSize)}`}
                            </p>
                        )}
                    </div>
                </div>

                {/* File list */}
                {showPreview && files.length > 0 && (
                    <ul className="mt-3 space-y-2">
                        {files.map((file, index) => {
                            const FileIcon = getFileIcon(file.type);
                            return (
                                <li
                                    key={`${file.name}-${index}`}
                                    className="flex items-center gap-3 p-2.5 rounded-md bg-neutral-100 dark:bg-neutral-800"
                                >
                                    <div className="w-8 h-8 flex items-center justify-center rounded bg-neutral-200 dark:bg-neutral-700 flex-shrink-0">
                                        <FileIcon size={16} className="text-neutral-500 dark:text-neutral-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-neutral-900 dark:text-white truncate">
                                            {file.name}
                                        </p>
                                        <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                            {formatFileSize(file.size)}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeFile(index)}
                                        className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                                        aria-label={`Remove ${file.name}`}
                                    >
                                        <X size={16} className="text-neutral-500 hover:text-error-500" />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* Error text */}
                {displayError && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-sm text-error-600 dark:text-error-400">
                        <AlertCircle size={14} />
                        <span role="alert">{displayError}</span>
                    </div>
                )}

                {/* Helper text */}
                {helperText && !displayError && (
                    <p className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

FileUpload.displayName = 'FileUpload';

export default FileUpload;
export type { FileUploadProps, FileUploadSize, FileInfo };
