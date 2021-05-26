const path = require('path');
const express = require('express');
const xss = require('xss');
const TodoService = require('./todo-service');
const todoRouter = express.Router();
const jsonParser = express.json();


const serializeTodo = todo => ({
    id: todo.id,
    title: xss(todo.title),
    completed: todo.completed
})

todoRouter
    .route('/')
    .get((req, res, next) => {

        //connect to the service to get the data
        TodoService.getTodos(req.app.get('db'))
            .then(todos => {
                res.json(todos.map(serializeTodo));
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        // take the input from the user
        const { title, completed = false } = req.body;
        const newTodo = { title };
        //validate the input
        if (!title) {
            return res.status(400).json({
                error: {
                    message: `Missing 'title' in request body`
                }
            });
        }

        newTodo.completed = completed;

        // save the input in database
        TodoService.insertTodo(
                req.app.get('db'),
                newTodo
            )
            .then(todo => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${todo.id}`))
                    .json(serializeTodo(todo))
            })
            .catch(next)
    });

todoRouter
    .route('/:todo_id')
    .all((req, res, next) => {
        if (isNaN(parseInt(req.params.todo_id))) {
            //if there is an error show it
            return res.status(404).json({
                error: {
                    message: `Invalid id`
                }
            })
        }

        //connect to the service to get the data
        TodoService.getTodoById(
                req.app.get('db'),
                req.params.todo_id
            )
            .then(todo => {
                if (!todo) {
                    //if there is an error show it
                    return res.status(404).json({
                        error: {
                            message: `Todo doesn't exist`
                        }
                    })
                }
                res.todo = todo
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {

        //get each one of the objects from the results and serialize them
        res.json(serializeTodo(res.todo))
    })
    //relevant
    .patch(jsonParser, (req, res, next) => {

        //take the input from the user
        const { title, completed } = req.body;
        const todoToUpdate = { title, completed };

        //validate the input by checking the length of the todoToUpdate object to make sure that we have all the values
        const numberOfValues = Object.values(todoToUpdate).filter(Boolean).length;
        if (numberOfValues === 0) {
            //if there is an error show it
            return res.status(400).json({
                error: {
                    message: `Request body must content either 'title' or 'completed'`
                }
            })
        }

        //save the input in the db
        TodoService.updateTodo(
                req.app.get('db'),
                req.params.todo_id,
                todoToUpdate
            )
            .then(updateTodo => {

                //get each one of the objects from the results and serialize them
                res.status(200).json(serializeTodo(updateTodo[0]))
            })
            .catch(next)
    })
    //relevant
    .delete((req, res, next) => {
        TodoService.deleteTodo(
                req.app.get('db'),
                req.params.todo_id
            )
            .then(numRowsAffected => {

                //check how many rows are effected to figure out if the delete was successful
                //res.status(204).json(numRowsAffected).end()
                res.status(204).end();
            })
            .catch(next)
    })


module.exports = todoRouter