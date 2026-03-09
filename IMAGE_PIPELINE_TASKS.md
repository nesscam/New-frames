# Image Pipeline Workflow Tasks

1. **State Management**: Create `EditorStoreService` using `BehaviorSubjects` of RxJS.
   - Global state: `originalImage`, `styledImage`, `selectedFrameId`, `orderStep` (`upload`, `style`, `frame`, `checkout`).
2. **Image Upload Service**: Manage file uploads to Firebase Storage.
   - Automatically rename files using `userId` and a timestamp.
3. **Error Interceptor**: Implement `HttpInterceptor` to catch API (AI) or Firebase errors and show them (log/alert).
4. **Skeleton Screens**: Create loading components for style gallery and frame selector.
