from vulnsphere.signals import set_current_user, clear_current_user


class CurrentUserMiddleware:
    """
    Middleware to capture the current user from the request and store it in thread-local storage.
    This allows signal handlers to access the user who triggered the action.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Set the current user before processing the request
        if hasattr(request, 'user') and request.user.is_authenticated:
            set_current_user(request.user)
        else:
            set_current_user(None)
        
        try:
            response = self.get_response(request)
        finally:
            # Always clear the user after the request is processed
            clear_current_user()
        
        return response
