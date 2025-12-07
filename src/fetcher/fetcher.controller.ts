import { Controller } from '@nestjs/common';
import { FetcherService } from './fetcher.service';

@Controller('fetcher')
export class FetcherController {
  constructor(private readonly fetcherService: FetcherService) {}
}
