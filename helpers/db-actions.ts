import { omit } from 'lodash';
import { type Db, type Document, ObjectId } from 'mongodb';
import { connectToDb } from './db-util';

export class DbActions {
  private dbConnection!: Db;

  private async init(): Promise<void> {
    if (!this.dbConnection) {
      ({ db: this.dbConnection } = await connectToDb());
    }
  }

  async getById(collection: Collections, id: string) {
    await this.init();
    return this.dbConnection.collection(collection).findOne({ _id: new ObjectId(id) });
  }

  async getAllCharacters(collection: Collections) {
    await this.init();
    return this.dbConnection
      .collection(collection)
      .find({}, { projection: { name: 1, imageUrl: 1 } })
      .toArray();
  }

  async updateById(collection: Collections, id: string, data: object) {
    await this.init();
    const cleanedData = omit(data, '_id');
    const response = await this.dbConnection
      .collection(collection)
      .updateOne({ _id: new ObjectId(id) }, { $set: { ...cleanedData } });
    return response.modifiedCount === 1;
  }

  async deleteById(collection: Collections, id: string) {
    await this.init();
    return this.dbConnection.collection(collection).deleteOne({ _id: new ObjectId(id) });
  }

  async createNew(collection: Collections, createObject: object) {
    await this.init();
    return this.dbConnection.collection(collection).insertOne(createObject as Document);
  }
}

export enum Collections {
  Characters = 'characters',
  Edges = 'edges',
  Hindrances = 'hindrances',
  Powers = 'powers',
  Gear = 'gear',
}
