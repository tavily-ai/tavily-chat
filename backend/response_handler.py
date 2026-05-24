import os
from pathlib import Path
from datetime import datetime
import re
import aiofiles

RESPONSES_DIR = Path("responses")
RESPONSES_DIR.mkdir(exist_ok=True)

# Store active conversations: thread_id -> filename
active_conversations: dict = {}


def sanitize_filename(text: str, max_length: int = 50) -> str:
    """Create a safe filename from text."""
    # Remove special characters, keep only alphanumeric and spaces
    clean = re.sub(r'[^\w\s\u0370-\u03FF\u1F00-\u1FFF-]', '', text)
    # Replace spaces with underscores
    clean = clean.replace(' ', '_')
    # Truncate
    return clean[:max_length].strip('_')


def get_conversation_filename(thread_id: str, first_question: str) -> str:
    """Get or create filename for a conversation."""
    if thread_id in active_conversations:
        return active_conversations[thread_id]
    
    # Create new filename
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    title = sanitize_filename(first_question)
    filename = f"{timestamp}_{title}.md"
    
    active_conversations[thread_id] = filename
    return filename


async def save_conversation_turn(
    thread_id: str,
    question: str,
    answer: str,
    turn_number: int,
    uploaded_files: list = None
):
    """Save a question-answer turn to the conversation file."""
    filename = get_conversation_filename(thread_id, question)
    filepath = RESPONSES_DIR / filename
    
    # Check if file exists (new conversation or continuing)
    is_new = not filepath.exists()
    
    async with aiofiles.open(filepath, "a", encoding="utf-8") as f:
        if is_new:
            # Write header for new conversation
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            title = question[:100] + "..." if len(question) > 100 else question
            header = f"""# Συνομιλία: {title}
📅 Έναρξη: {timestamp}

"""
            if uploaded_files:
                header += f"📎 Αρχεία: {', '.join(uploaded_files)}\n\n"
            
            await f.write(header)
        
        # Write this turn
        turn_content = f"""---

## 💬 Ερώτηση {turn_number}
{question}

## 🤖 Απάντηση {turn_number}
{answer}

"""
        await f.write(turn_content)
    
    return str(filepath)


def get_turn_number(thread_id: str) -> int:
    """Get the current turn number for a thread."""
    filename = active_conversations.get(thread_id)
    if not filename:
        return 1
    
    filepath = RESPONSES_DIR / filename
    if not filepath.exists():
        return 1
    
    # Count existing turns
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
            turns = content.count("## 💬 Ερώτηση")
            return turns + 1
    except:
        return 1


def clear_conversation(thread_id: str):
    """Remove a conversation from active tracking."""
    if thread_id in active_conversations:
        del active_conversations[thread_id]


def list_conversations() -> list:
    """List all saved conversations."""
    conversations = []
    
    if not RESPONSES_DIR.exists():
        return conversations
    
    for filepath in sorted(RESPONSES_DIR.glob("*.md"), reverse=True):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                full_content = f.read()
                
                # Extract title from first line
                lines = full_content.split('\n')
                title = "Untitled"
                date = ""
                
                for line in lines:
                    if line.startswith("# Συνομιλία:"):
                        title = line.replace("# Συνομιλία:", "").strip()
                    elif line.startswith("📅 Έναρξη:"):
                        date = line.replace("📅 Έναρξη:", "").strip()
                
                # Count messages
                message_count = full_content.count("## 💬 Ερώτηση")
                
                conversations.append({
                    "filename": filepath.name,
                    "title": title[:50] + "..." if len(title) > 50 else title,
                    "date": date,
                    "messages": message_count
                })
        except Exception as e:
            print(f"Error reading {filepath}: {e}")
            continue
    
    return conversations


def get_conversation_content(filename: str) -> str:
    """Get the full content of a conversation."""
    filepath = RESPONSES_DIR / filename
    
    if not filepath.exists():
        return ""
    
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return f.read()
    except:
        return ""


def delete_conversation(filename: str) -> bool:
    """Delete a conversation file."""
    filepath = RESPONSES_DIR / filename
    
    if not filepath.exists():
        return False
    
    try:
        filepath.unlink()
        return True
    except:
        return False
