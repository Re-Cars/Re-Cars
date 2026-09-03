import { JwtPayload } from './jwt-payload.interface';

declare global {
  namespace Express {
    interface User extends JwtPayload {}
    interface Request {
      user?: User;
    }
  }
}
