def check_valid_string(s):
    # Track minimum and maximum possible open parentheses
    min_open = 0  # Minimum possible open parens
    max_open = 0  # Maximum possible open parens
    
    for char in s:
        if char == '(':
            min_open += 1
            max_open += 1
        elif char == ')':
            min_open -= 1
            max_open -= 1
        else:  # char == '*'
            min_open -= 1  # Treat * as )
            max_open += 1  # Treat * as (
        
        # If max becomes negative, too many )
        if max_open < 0:
            return False
        
        # If min becomes negative, reset to 0
        # (we can use * as empty string)
        if min_open < 0:
            min_open = 0
    
    # Valid if we can balance all opens
    return min_open == 0
