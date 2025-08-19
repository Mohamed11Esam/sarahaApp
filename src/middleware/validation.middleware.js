export const isValid = (schema) => {
   
    return (req,res,next)=>{
        const { error } = schema.validate({...req.body,...req.params,...req.query}, { abortEarly: false });
        if (error) {
          let errMsg = error.details.map((err) => {
              return err.message;
          });
          errMsg = errMsg.join(", ");
          throw new Error("Joi Validation error: " + errMsg, { cause: 400 });
        }
        next();
    }
};
