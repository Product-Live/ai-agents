// A script file receives the same $ object as an inline expression.
// With "response": "FILE", the returned string becomes the content of outputFileName.
log('Greeting received: ' + $.data.greeting);
return $.data.greeting + ' world';
