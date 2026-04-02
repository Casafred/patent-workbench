"""
CLI Agent 命令历史模块

管理命令历史记录，支持搜索、重放和持久化。
"""

import os
import json
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from collections import deque


class CommandHistory:
    """命令历史管理器"""
    
    def __init__(self, max_size: int = 1000, history_dir: str = None):
        self.max_size = max_size
        self.history_dir = Path(history_dir) if history_dir else self._get_default_history_dir()
        self.history_file = self.history_dir / "command_history.json"
        self._history: deque = deque(maxlen=max_size)
        self._session_start = datetime.now()
    
    def _get_default_history_dir(self) -> Path:
        if os.name == "nt":
            base = Path(os.environ.get("APPDATA", "~"))
        else:
            base = Path.home()
        return base / ".cli_agent"
    
    def add(self, command: str, args: Dict[str, Any] = None, result: str = None, success: bool = True) -> None:
        entry = {
            "timestamp": datetime.now().isoformat(),
            "session": self._session_start.isoformat(),
            "command": command,
            "args": args or {},
            "result": result[:500] if result and len(result) > 500 else result,
            "success": success
        }
        self._history.append(entry)
    
    def get_all(self) -> List[Dict[str, Any]]:
        return list(self._history)
    
    def get_recent(self, count: int = 10) -> List[Dict[str, Any]]:
        return list(self._history)[-count:]
    
    def search(self, query: str, limit: int = 20) -> List[Dict[str, Any]]:
        query = query.lower()
        results = []
        
        for entry in reversed(self._history):
            if query in entry["command"].lower():
                results.append(entry)
                if len(results) >= limit:
                    break
        
        return results
    
    def get_by_session(self, session_id: str = None) -> List[Dict[str, Any]]:
        if session_id is None:
            session_id = self._session_start.isoformat()
        
        return [entry for entry in self._history if entry["session"] == session_id]
    
    def clear(self) -> None:
        self._history.clear()
    
    def save(self) -> None:
        self.history_dir.mkdir(parents=True, exist_ok=True)
        
        data = {
            "version": "1.0",
            "saved_at": datetime.now().isoformat(),
            "entries": list(self._history)
        }
        
        with open(self.history_file, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    
    def load(self) -> None:
        if not self.history_file.exists():
            return
        
        try:
            with open(self.history_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            
            entries = data.get("entries", [])
            
            self._history.clear()
            for entry in entries[-self.max_size:]:
                self._history.append(entry)
                
        except Exception:
            pass
    
    def get_stats(self) -> Dict[str, Any]:
        total = len(self._history)
        successful = sum(1 for e in self._history if e.get("success", True))
        
        command_counts = {}
        for entry in self._history:
            cmd = entry["command"]
            command_counts[cmd] = command_counts.get(cmd, 0) + 1
        
        most_used = sorted(command_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "total_commands": total,
            "successful_commands": successful,
            "failed_commands": total - successful,
            "success_rate": round(successful / total * 100, 2) if total > 0 else 0,
            "most_used_commands": most_used,
            "session_start": self._session_start.isoformat()
        }
    
    def export(self, export_path: str, format: str = "json") -> None:
        if format == "json":
            with open(export_path, "w", encoding="utf-8") as f:
                json.dump(list(self._history), f, ensure_ascii=False, indent=2)
        elif format == "txt":
            with open(export_path, "w", encoding="utf-8") as f:
                for entry in self._history:
                    timestamp = entry.get("timestamp", "")
                    command = entry.get("command", "")
                    success = "✓" if entry.get("success", True) else "✗"
                    f.write(f"[{timestamp}] {success} {command}\n")
    
    def get_command_at(self, index: int) -> Optional[Dict[str, Any]]:
        history_list = list(self._history)
        if -len(history_list) <= index < len(history_list):
            return history_list[index]
        return None
    
    def get_previous_command(self, current_index: int = -1) -> Optional[str]:
        history_list = list(self._history)
        if not history_list:
            return None
        
        if current_index == -1:
            return history_list[-1].get("command")
        
        new_index = current_index - 1
        if -len(history_list) <= new_index < 0:
            return history_list[new_index].get("command")
        
        return None
    
    def get_next_command(self, current_index: int) -> Optional[str]:
        history_list = list(self._history)
        if not history_list:
            return None
        
        new_index = current_index + 1
        if 0 <= new_index < len(history_list):
            return history_list[new_index].get("command")
        
        return None
