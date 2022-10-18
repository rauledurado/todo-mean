const express = require('express');
const app = express();


const { mongoose } = require('./db/mongoose');
 
const bodyParser = require('body-parser');

// Load in mongoose models
const { List, Task, User } = require('./db/modules');

/* MIDDLEWARE  */

// Load middleware

app.use(bodyParser.json());


// CORS headers 

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Methods", "GET, POST, HEAD, OPTIONS, PUT, PATCH, DELETE");
    res.header("Access-Control-Allow-Origin", "*"); // update to match the domain you will make the request from
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


// check whether the request has a valid JWT access token
let authenticate = (req, res, next) => {
    let token = req.header('x-access-token');

    // verify the JWT
    jwt.verify(token, User.getJWTSecret(), (err, decoded) => {
        if (err) {
            // there was an error
            // jwt is invalid - * DO NOT AUTHENTICATE *
            res.status(401).send(err);
        } else {
            // jwt is valid
            req.user_id = decoded._id;
            next();
        }
    });
}

// Verify Refresh Token Middleware (which will be verifying the session)
let verifySession = (req, res, next) => {
    // grab the refresh token from the request header
    let refreshToken = req.header('x-refresh-token');

    // grab the _id from the request header
    let _id = req.header('_id');

    User.findByIdAndToken(_id, refreshToken).then((user) => {
        if (!user) {
            // user couldn't be found
            return Promise.reject({
                'error': 'User not found. Make sure that the refresh token and user id are correct'
            });
        }


        // if the code reaches here - the user was found
        // therefore the refresh token exists in the database - but we still have to check if it has expired or not

        req.user_id = user._id;
        req.userObject = user;
        req.refreshToken = refreshToken;

        let isSessionValid = false;

        user.sessions.forEach((session) => {
            if (session.token === refreshToken) {
                // check if the session has expired
                if (User.hasRefreshTokenExpired(session.expiresAt) === false) {
                    // refresh token has not expired
                    isSessionValid = true;
                }
            }
        });

        if (isSessionValid) {
            // the session is VALID - call next() to continue with processing this web request
            next();
        } else {
            // the session is not valid
            return Promise.reject({
                'error': 'Refresh token has expired or the session is invalid'
            })
        }

    }).catch((e) => {
        res.status(401).send(e);
    })
}

/* END MIDDLEWARE  */




/* ROUTE HANDLERS*/


/* LIST ROUTES */




/**
 * GET /lists
 * Purpose: GET all lists
 */
app.get('/lists', (req, res) => {
    // to return an array of all the lists in the data base

    List.find({}).then((lists) => {
        res.send(lists);
    });

});


/**
 * POST /lists
 * Purpose: create a list
 */
app.post('/lists', (req, res) => {
    // to create a new list and return the new list document back to user (includes id)
    // the list info (fields) will be passed in via a JSON body

    let title = req.body.title;

    let newList = new List ({
        title
    });

    newList.save().then((listDoc) => {
        // the full list document is required (incl, id)
        res.send(listDoc);
    });

});

/**
 * PATCH /lists/:id
 * Purpose: update a list
 */
app.patch('/lists/:id', (req, res) => {
    // to update the specific list (list document with is in the URL) which is specified in JSON 

    List.findOneAndUpdate({_id: req.params.id }, {
        $set: req.body
        
    }, () => {
        console.log('Success: Lists updated!');
    }).then(() => {
        res.sendStatus(200);
    });
});




/**
 * DELETE /lists/:id
 * Purpose: update a list
 */
app.delete('/lists/:id', (req, res) => {
    // to delete the specifies list (list document with is in the URL) which is specified in JSON 

    List.findOneAndRemove({
        _id: req.params.id
    }).then((removedListDoc) => {
        res.send(removedListDoc);
    })

});


/* LIST ROUTES ENDS HERE*/


//************************************************************************************************************ */

/* TASK ROUTES */


/**
 * GET lists/:listId/tasks
 * Purpose: to get tasks belonging to specific lists
*/

app.get('/lists/:listId/tasks', (req, res) => {
    
    // to return all tasks belonging to specific lists

    Task.find({
        _listId: req.params.listId
    }).then((tasks) => {
        res.send(tasks);
    });
});

app.get('/lists/:listId/tasks/:taskId', (req, res) => {
    
    // to return all tasks belonging to specific lists

    Task.findOne({
        _id: req.params.taskId,
        _listId: req.params.listId
    }).then((task) => {
        res.send(task);
    });
});




/**
 * POST /lists/:listId/tasks
 * Purpose: Get all task in a specific list
 */


app.post('/lists/:listId/tasks', (req, res) => {
    // to add tasks to specific list

    let newTask = new Task({
        title: req.body.title,
        _listId: req.params.listId
    });

    newTask.save().then((newTaskDoc) => {
        res.send(newTaskDoc);
    });
    
});

/**
 * PATCH /lists/:listId/tasks/:taskId
 * Purpose: update an existing task 
 */

app.patch('/lists/:listId/tasks/:taskId', (req, res) => {
    // to update tasks (specified by task id)
    Task.findOneAndUpdate({_id: req.params.taskId, _listId: req.params.listId}, {
        $set: req.body
    }, () => {
        console.log("Success: TaskUpdated successfully");
    }).then(() => {
        res.send({message: 'Updated successfully!'});
    });
});


/**
 * DELETE /lists/:listId/tasks/:taksId
 * Purpose: delete a task (specified by task id)
 */

app.delete('/lists/:listId/tasks/:taskId', (req, res) => {
    // to remove any task item specified by id
    
    Task.findOneAndRemove({
        _id: req.params.taskId,
         _listId: req.params.listId
        
        }).then((removedTaskDoc) => {
            res.send(removedTaskDoc);
        });
})

/* TASK ROUTES ENDS HERE */

/* USER ROUTES */

/**
 * POST /users
 * Purpose: to sig up
 */

app.post('/users', (req, res) => {
    // User sign up

    let body = req.body;
    let newUser = new User(body);

    newUser.save().then(() => {
        return newUser.createSession();
    }).then((refreshToken) => {
        // Session created successfully - refreshToken returned.
        // now we geneate an access auth token for the user

        return newUser.generateAccessAuthToken().then((accessToken) => {
            // access auth token generated successfully, now we return an object containing the auth tokens
            return { accessToken, refreshToken }
        });
    }).then((authTokens) => {
        // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
        res
            .header('x-refresh-token', authTokens.refreshToken)
            .header('x-access-token', authTokens.accessToken)
            .send(newUser);
    }).catch((e) => {
        res.status(400).send(e);
    })
})

/**
 * POST /users/login
 * Purpose: to login
 */

app.post('/users/login', (req, res) => {
    let email = req.body.email;
    let password = req.body.password;

    User.findByCredentials(email, password).then((user) => {
        return user.createSession().then((refreshToken) => {
            // Session created successfully - refreshToken returned.
            // now we geneate an access auth token for the user

            return user.generateAccessAuthToken().then((accessToken) => {
                // access auth token generated successfully, now we return an object containing the auth tokens
                return { accessToken, refreshToken }
            });
        }).then((authTokens) => {
            // Now we construct and send the response to the user with their auth tokens in the header and the user object in the body
            res
                .header('x-refresh-token', authTokens.refreshToken)
                .header('x-access-token', authTokens.accessToken)
                .send(user);
        })
    }).catch((e) => {
        res.status(400).send(e);
    });
})


/**
 * GET /users/me/access-token
 * Purpose: generates and returns an access token
 */
app.get('/users/me/access-token', verifySession, (req, res) => {
    // we know that the user/caller is authenticated and we have the user_id and user object available to us
    req.userObject.generateAccessAuthToken().then((accessToken) => {
        res.header('x-access-token', accessToken).send({ accessToken });
    }).catch((e) => {
        res.status(400).send(e);
    });
})



/* HELPER METHODS */
let deleteTasksFromList = (_listId) => {
    Task.deleteMany({
        _listId
    }).then(() => {
        console.log("Tasks from " + _listId + " were deleted!");
    })
}








//Console log for server condition

app.listen(3000, () => {
    console.log('server is listning on 3000')
})