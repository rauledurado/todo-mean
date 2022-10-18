import { Injectable } from '@angular/core';
import { WebRequestService } from './web-request.service';
import { Task } from './models/task.model';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  constructor(private webReqService: WebRequestService) { }

  getLists() {
    return this.webReqService.get('lists');
  }

  createNewList(title: string) {
    //want to send a web request to create a list

    return this.webReqService.post('lists', { title });
  }

  
  
  
  
  getTasks(listId: string) {
    return this.webReqService.get(`lists/${listId}/tasks`);
  }

  createNewTask(title: string, listId: string) {
    //want to send a web request to create a list

    return this.webReqService.post(`lists/${listId}/tasks`, { title });
  }



  completed(task: Task) {
    return this.webReqService.patch(`lists/${task._listId}/tasks/${task._id}`,{
      completed: !task.completed
    });
  }

}
