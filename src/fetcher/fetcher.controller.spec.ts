import { Test, TestingModule } from '@nestjs/testing';
import { FetcherController } from './fetcher.controller';

describe('FetcherController', () => {
  let controller: FetcherController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FetcherController],
    }).compile();

    controller = module.get<FetcherController>(FetcherController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
